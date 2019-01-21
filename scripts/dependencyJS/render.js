var DataExtract = require("../dependencyJS/dataExtract")
var DataFilter = require("../dependencyJS/dataFilter")
var Line = require("../dependencyJS/line")
var RenderElement = require("../dependencyJS/render")
var SummaryView = require("../dependencyJS/summaryView")
var Events = require("../dependencyJS/events")

var RenderElement = {
    onlyUnique(value, index, self) {
        return self.indexOf(value) === index;
    },

    loadTable(htmlTagId, workItemsWithDependency) {

        var table = "<table class='ms-Table' id='mainTable'><thead><th><b>Team</b></th>";
        for (var i = global.startSprint; i <= global.endSprint; i++) {
            table += "<th><b>" + global.sprintIterations[i] + "</b></th>";
        }
        table += "</thead><tbody>"

        table = table + this.renderTableItems(workItemsWithDependency) + "</tbody></table>"
        $(htmlTagId).append(table);

        idArray.forEach(element => {
            drake.containers.push(document.getElementById(element))
        });
    },

    renderTableItems(workItemsWithDependency) {
        var teams = [];
        workItemsWithDependency.map(function (wid) {
            var teamName;
            var areaPatharray = wid["AreaPath"].split("\\")
            areaPatharray.length == 0 ? teamName = wid["AreaPath"] : teamName = areaPatharray[areaPatharray.length - 1];
            //Create a json for the team name and Area path
            var teamAreas = {
                "teamName": teamName,
                "areaPath": wid["AreaPath"]
            };

            var teamNameExist = 0;
            if (teams.length > 0) {
                teams.forEach(team => {
                    if (team.teamName == teamAreas.teamName) {
                        teamNameExist = 1;
                    }
                });
            }

            if (teamNameExist == 0) {
                teams.push(teamAreas);
            }
        })

        //teams = teams.filter(this.onlyUnique)
        var teamWorkItems = teams.map(team => ({ "team": team.teamName, "workItems": workItemsWithDependency.filter(function (wi)
            {
                var teamN;
                var areaPatharray = wi["AreaPath"].split("\\")
                areaPatharray.length == 0 ? teamN = wi["AreaPath"] : teamN = areaPatharray[areaPatharray.length - 1];
                
                return teamN == team.teamName   
            }
        ) }));
        var rows = ""

        teamWorkItems.forEach(teamWorkItem => {
            rows = rows + "<tr> <td><b>" + teamWorkItem.team + "</b></td>"
            rows = rows + this.renderIterationWorkItems(teamWorkItem.workItems) + "</tr>"
        });
        return rows
    },

    renderIterationWorkItems(teamWorkItems) {
        let iterations = global.sprintIterations.slice(global.startSprint, global.endSprint + 1);
        let iterationWorkItems = iterations.map(iteration => ({ iteration, workItems: teamWorkItems.filter(wi => wi.IterationPath.includes(iteration)) }));
        var cells = ""

        iterationWorkItems.forEach(iterationWorkItem => {
            if (iterationWorkItem.workItems.length > 0) {
                idArray.push('contain' + index)
                cells = cells + "<td id='contain" + index + "'class ='container'>"
                index++
                iterationWorkItem.workItems.forEach(workItem => {
                    if (workItem.Title.includes("[Waiting to create work item]")) {
                        cells = cells + "<div id='" + workItem.Id + "' class='task ignoreItem'>" + workItem.Title + "</div>"
                    }
                    else {
                        cells = cells + this.renderItemSticky(workItem.Id, workItem.url, workItem.Title, workItem.WorkItemType)
                    }
                });
                cells = cells + "</td>"
            }
            else {
                idArray.push('contain' + index)
                cells = cells + "<td id='contain" + index + "'class ='container'></td>"
                index++
            }
        });
        return cells
    },

    renderItemSticky(id, url, title, workItemType) {
        var colour = "#0095CB"

        if (workItemType == "User Story") {
            colour = "#0095CB"
        }
        else if (workItemType == "Feature") {
            colour = "#820092"
        }
        else {
            colour = "#EFD708";
        }
        return "<div id='" + id + "' class='board-tile-content-container' style='border-left: solid 5px " + colour + " '><div class='board-tile-content'><span style='display: inline-block;margin-right: 3px;'><div class='ms-TooltipHost host_931d1596 work-item-type-icon-wrapper'><i aria-label='User Story' class='work-item-type-icon bowtie-icon bowtie-symbol-task' style='color: " + colour + "'></i></div></span><div class='title-ellipsis'><div class='title-ellipsis'><a href='" + url + "' target='_blank'><span class='clickable-title' role='button'>" + title + "</span></a></div></div></div></div>"
    },

    async fetchItems(witClient, client, Contracts, teamID) {

        try {
            var areaPaths = []

            for (var i = 0; i < teamID.length; i++) {
                var areaPath = await DataExtract.getTeamAreaPath(teamID[i]);
                areaPaths.push(areaPath)
            }

            var workItems = await this.getTeamWorkItems(witClient, client, Contracts, areaPaths);

            if (workItems == undefined) {
                return;
            }

            var workItemsOfTeamObj = DataFilter.transformData(workItems)
            var workItemsobj = await this.getAllteamDependentItems(workItemsOfTeamObj)
            var workItemsWithDummy = DataFilter.getWorkItemsWithDummy(workItemsOfTeamObj, workItemsobj, areaPaths);

            if (workItemsWithDummy == undefined || workItemsWithDummy.length == 0) {
                appInsights.trackEvent("No data for selected sprints for corresponding team. :- " + areaPaths)
                Events.hideDependencyContainer();
                Events.clearScreen();
                Events.clearLines();
                document.getElementById("displayNotMessage").innerHTML = "No Dependency marked within the selected sprints"
                return undefined;
            }
            else {
                this.TeamLevelRender(workItemsWithDummy, areaPaths);
            }
        } catch (error) {
            appInsights.trackException(error)
        }
    },

    async getTeamWorkItems(witClient, client, Contracts, AreaPath) {
        var workItemsOfTeam = await DataExtract.getWorkItems(witClient, client, Contracts, AreaPath);

        if (workItemsOfTeam == undefined) {
            appInsights.trackEvent("No data for selected sprints for corresponding team. :- " + AreaPath)

            Events.hideDependencyContainer();
            Events.clearScreen();
            Events.clearLines();
            document.getElementById("displayNotMessage").innerHTML = "No Dependency marked within the selected sprints"
            return undefined;
        }
        else
            return workItemsOfTeam;
    },

    async getAllteamDependentItems(workItemsOfTeamObj) {
        var workItemsOfTeam = DataFilter.getWorkItemsWithDependency(workItemsOfTeamObj)
        var dependentWorkItem = [];
        var workItemsOfdependentTeam = undefined;
        workItemsOfTeam.forEach(wi => {
            if (wi.DependentOn != undefined && wi.DependentOn.length != 0) { dependentWorkItem = dependentWorkItem.concat(wi.DependentOn); }
            if (wi.DependentBy != undefined && wi.DependentBy.length != 0) { dependentWorkItem = dependentWorkItem.concat(wi.DependentBy); }
        });

        if (dependentWorkItem.length != 0) {
            workItemsOfdependentTeam = await DataExtract.getWorkItemsWithID(dependentWorkItem);
        }

        if (workItemsOfdependentTeam == undefined)
            return undefined;
        else {
            var workItemsOfdependentObj = DataFilter.transformData(workItemsOfdependentTeam);
            workItemsOfdependentObj.forEach(wi => {
                var temp = workItemsOfTeam.find(x => x.Id == wi.Id);
                if (temp == undefined) {
                    workItemsOfTeam = workItemsOfTeam.concat(wi);
                }
            });
        }

        var wiHavingDependenciesSprintWise = []
        let iterations = global.sprintIterations.slice(global.startSprint, global.endSprint + 1);

        //debugger
        var flag;
        workItemsOfTeam.forEach(wi => {
            flag = true
            for (var i = 0; i < iterations.length; i++) {
                if (wi.IterationPath.includes(iterations[i])) {
                    wiHavingDependenciesSprintWise = wiHavingDependenciesSprintWise.concat(wi);
                    flag = false;
                    break;
                }
            }

            if (flag) {
                if (global.skipList.indexOf(wi.Id) == -1) {
                    global.skipList = global.skipList.concat(wi.Id);
                }
            }
        });
        return wiHavingDependenciesSprintWise;
    },

    TeamLevelRender(workItemsWithDummy, areaPath) {
        var workItemsWithDependency = DataFilter.getWorkItemsWithDependency(workItemsWithDummy);
        SummaryView.createTable(workItemsWithDependency, areaPath);

        workItemsWithDependency.forEach(wid => {
            dict[wid.Id] = []
        });

        this.loadTable("#mainTableContainer", workItemsWithDependency)
        Line.createLines(workItemsWithDependency, areaPath)
    }
}
module.exports = RenderElement