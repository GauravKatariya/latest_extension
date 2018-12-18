var DataExtract = require("../dependencyJS/dataExtract")
var DataFilter = require("../dependencyJS/dataFilter")
var Line = require("../dependencyJS/line")
var RenderElement = require("../dependencyJS/render")
var SummaryView = require("../dependencyJS/summaryView")

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
        var teams = workItemsWithDependency.map(function (wid) {
            var areaPatharray = wid["AreaPath"].split("\\")
            var teamName;
            areaPatharray.length == 0 ? teamName = wid["AreaPath"] : teamName = areaPatharray[areaPatharray.length - 1];
            return teamName;
        })
        teams = teams.filter(this.onlyUnique)
        var teamWorkItems = teams.map(team => ({ "team": team, "workItems": workItemsWithDependency.filter(wi => wi.AreaPath.includes(team)) }));
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
            var areaPath = await DataExtract.getTeamAreaPath(teamID);
            var workItemsobj = await this.getAllteamDependentItems(witClient, client, Contracts, areaPath)
            if (workItemsobj == undefined) {
                return;
            }
            var workItemsWithDummy = DataFilter.getWorkItemsWithDummy(workItemsobj, areaPath)
            this.TeamLevelRender(workItemsWithDummy, areaPath);
        } catch (error) {
            appInsights.trackException(error)
        }
    },

    async getAllteamDependentItems(witClient, client, Contracts, AreaPath) {
        var workItemsOfTeam = await DataExtract.getWorkItems(witClient, client, Contracts, AreaPath);

        if (workItemsOfTeam == undefined) {
            appInsights.trackEvent("No data for selected sprints for corresponding team. :- " + AreaPath)
            return undefined;
        }

        var workItemsOfTeamObj = DataFilter.transformData(workItemsOfTeam)
        var dependentWorkItem = [];

        workItemsOfTeamObj.forEach(wi => {
            if (wi.DependentOn != undefined && wi.DependentOn.length != 0) { dependentWorkItem = dependentWorkItem.concat(wi.DependentOn); }
            if (wi.DependentBy != undefined && wi.DependentBy.length != 0) { dependentWorkItem = dependentWorkItem.concat(wi.DependentBy); }
        });

        var workItemsOfdependentTeam = await DataExtract.getWorkItemsWithID(dependentWorkItem);
        if (workItemsOfdependentTeam == undefined)
            return undefined;
        var workItemsOfdependentObj = DataFilter.transformData(workItemsOfdependentTeam);

        workItemsOfdependentObj.forEach(wi => {
            var temp = workItemsOfTeamObj.find(x => x.Id == wi.Id);
            if (temp == undefined) {
                workItemsOfTeamObj = workItemsOfTeamObj.concat(wi);
            }
        });
        return workItemsOfTeamObj;
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