(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
var DataExtract = {

    getwiql(areaPath) {
        var wiqlWhereClauses = ["([System.AreaPath] = '" + areaPath + "')"];
        return {
            wiql: "SELECT [System.Id], \n [System.IterationPath], \n [System.TeamProject], \n [System.WorkItemType], \n [System.AssignedTo], \n [System.Title]\n FROM WorkItems\n WHERE " + wiqlWhereClauses
        };
    },

    getTeamAreaPath(teamId) {
        return new Promise((resolve, reject) => {
            VSS.require(["TFS/Work/RestClient"], (WorkRestClient) => {
                var teamContext = {
                    projectId: global.projectId,
                    teamId: teamId,
                };

                //create work client
                var client = WorkRestClient.getClient();

                //query the area paths
                client.getTeamFieldValues(teamContext).then((settings) => {
                    resolve(settings.defaultValue);
                });
            });
        });
    },

    getTeamIterations(teamId)
    {
        return new Promise((resolve, reject) => {
            VSS.require(["TFS/Work/RestClient"], (WorkRestClient) => {
                var teamContext = {
                    projectId: global.projectId,
                    teamId: teamId,
                };
                //create work client
                var client = WorkRestClient.getClient();

                var sprintsArray = []
                //query the area paths
                client.getTeamIterations(teamContext).then((settings) => {
                    settings.forEach(element => {
                        debugger;
                        if(element.timeFrame == "current")
                            global.currentSprint = sprintsArray.length; 
                            
                        sprintsArray = sprintsArray.concat(element.name);
                    });
                    resolve(sprintsArray);
                });
            });
        });
    },
    async getWorkItems(witClient, client, contracts , areaPath) {
        var wiqlResult = { "query": this.getwiql(areaPath).wiql }
        var queryResult = await witClient.queryByWiql(wiqlResult, VSS.getWebContext().project.id)

        if (queryResult.workItems.length > 0) {
            var workItems = await client.getWorkItems(queryResult.workItems.map(function (wi) { return wi.id; }), null, null, contracts.WorkItemExpand.Relations)
            return workItems;
        }
    },

    async getWorkItemsWithID(workItemsID) {
        var workItems = await client.getWorkItems(workItemsID, null, null, contracts.WorkItemExpand.Relations)
        return workItems;
    },

    async getTeamNames(client) {
        var maxTeamCount = 50;
        var countAPIResponse = 1;
        var currentSkip = 0;
        var batchSize = 50;
        var teamLists = []
        while (true) {
            teams = await client.getTeams(global.projectId, batchSize, currentSkip)
            // Check if data returned from API is empty
            if (teams == undefined || teams.length == 0) {
                countAPIResponse = countAPIResponse + 1;
                return;
            }
            teamLists = teamLists.concat(teams);
            countAPIResponse = countAPIResponse + 1;

            currentSkip += batchSize;
            if (currentSkip >= maxTeamCount) {
                break;
            }
        }

        return teamLists;
    }
}

module.exports = DataExtract
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
(function (global){
var DataFilter = {
    transformData(allWI) {
        allWI = allWI.map(wi => ({
            "Title": wi.fields["System.Title"],
            "Id": wi.id,
            "AreaPath": wi.fields["System.AreaPath"],
            "IterationPath": wi.fields["System.IterationPath"],
            "DependentOn": wi.relations != undefined ? wi.relations.filter(relation => relation.rel.includes("Reverse")).map(item => parseInt(item.url.replace(global.vstsHostURL+"_apis/wit/workItems/", ""))) : undefined,
            "DependentBy": wi.relations != undefined ? wi.relations.filter(relation => relation.rel.includes("Forward")).map(item => parseInt(item.url.replace(global.vstsHostURL+"_apis/wit/workItems/", ""))) : undefined,
            "WorkItemType": wi.fields["System.WorkItemType"],
            "url": global.vstsHostURL+"_workitems/edit/" + wi.id
        }))
        return allWI
    },

    getWorkItemsWithDummy(allWI , areaPath) {
        var wiDependenciesInTitle = allWI.filter(wi => wi.Title.includes("[Dependency]") && wi.AreaPath.includes(areaPath))
        var itemsToBeProcessed = allWI.filter(wi => !wiDependenciesInTitle.find(wis=> wis.Id==wi.Id))

        wiDependenciesInTitle.forEach(element => {
            itemsToBeProcessed.push(
                {
                    "Title": "[Waiting to create work item]",
                    "Id": element.Id + "0",
                    "AreaPath": "Dummy_iteration_path\\"+ ((element.Title.split("]"))[1]).substring(1),
                    "IterationPath": global.sprintIterations[global.startSprint],
                    "DependentOn": [],
                    "DependentBy": [parseInt(element.Id)],
                    "WorkItemType": "DummyItem",
                    "url": undefined
                }
            )
            if (element.DependentOn != undefined) {
                element.DependentOn.push(parseInt(element.Id + "0"))
            }
            else {
                element.DependentOn = [parseInt(element.Id + "0")]
            }

            itemsToBeProcessed.push(element)
        });
        return itemsToBeProcessed;
    },

    getWorkItemsWithDependency(allWI) {
        var wiHavingDependencies = allWI.filter(wi => wi.DependentBy != undefined);
        return wiHavingDependencies
    },

    getWorkItemsWithDependencyTeamwise(allWI ,areaPath) {
        var wiHavingDependencies = allWI.filter(wi => wi.DependentBy != undefined && wi.AreaPath.includes(areaPath));
        return wiHavingDependencies
    }
}

module.exports = DataFilter
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
var EcsClients = {
    async getConfig() {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4
                if (xmlhttp.status == 200) {
                    ecsClientFilter = JSON.parse(xmlhttp.responseText);
                    return ecsClientFilter.DependencyTracker.Teams;                  
                }
                else if (xmlhttp.status == 400) {
                    alert('There was an error 400');
                    return undefined;
                }
                else {
                    alert('something else other than 200 was returned');
                    return undefined;
                }
            }
        };

        xmlhttp.open("GET", "https://b.config.skype.net/config/v1/CSE-Teams/1.0.0.0/INT-PLT-EIP-DependencyTracker?Environment=DependencyTracker", true);
        xmlhttp.send();
    }
}

module.exports = EcsClients
},{}],4:[function(require,module,exports){
(function (global){
var Events = {
    reRenderOnScroll() {
        for (key in dict) {
            dict[key].forEach(element => {
                element["line"].position();
            })
        }
    },
    toggleGraphandSummaryView() {
        if (document.getElementById("teamGraph").style.display == "" || document.getElementById("teamGraph").style.display == "none") {
            document.getElementById("teamGraph").style.display = "block"
            document.getElementById("hideSection").style.display = "none"
            $('#fullSizeButton').children().html("Dependency View")
        }
        else {

            document.getElementById("teamGraph").style.display = "none"
            document.getElementById("hideSection").style.display = "block"
            $('#fullSizeButton').children().html("Summary view")
        }
    },
    addDropdownItems(list , htmlId1 , htmlId2) {
        global.teamsList = list;
        list.forEach(element => {
            var x = document.getElementById(htmlId1);
            var option = document.createElement("option");
            option.text = element.name;
            option.value = element.name;
            x.add(option);
        });
        var DropdownHTMLElements = document.querySelectorAll(htmlId2);
        for (var i = 0; i < DropdownHTMLElements.length; ++i) {
            var Dropdown = new fabric['Dropdown'](DropdownHTMLElements[i]);
        }
    },
    addIterationDropdownItems(list , htmlId1 , html2) {
        list.forEach(element => {
            var x = document.getElementById(htmlId1);
            var option = document.createElement("option");
            option.text = element;
            option.value = element;
            x.add(option);
        });
        var DropdownHTMLElements = document.querySelectorAll(html2);
        for (var i = 0; i < DropdownHTMLElements.length; ++i) {
            var Dropdown = new fabric['Dropdown'](DropdownHTMLElements[i]);
        }
    }
}

module.exports = Events
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
var DataFilter = require("../dependencyJS/dataFilter")

var Line = {
    removeLineObject(lineObject) {
        lineObject.remove()
    },

    deleteElement(key, element) {
        var index = dict[key].indexOf(element);
        if (index > -1) {
            dict[key].splice(index, 1);
        }
    },

    removeLine(key1, key2) {
        var lineElement1 = findElement(key1, key1 + "-" + key2)
        var lineElement2 = findElement(key2, key2 + "-" + key1)
        removeLineObject(lineElement1)
        deleteElement(key1, lineElement1)
        deleteElement(key2, lineElement2)
    },

    findElement(key, value) {
        var toBeReturned;
        dict[key].forEach(x => {
            if (x.id == value.trim()) {
                toBeReturned = x;
            }
        });
        return toBeReturned
    },

    drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi) {
        var colorCode;

        if (title_dwi.includes("[Waiting to create work item]")) {
            colorCode = '#D7003C';
        }
        else if (sprint_wi == sprint_dwi) {
            colorCode = '#f8b47a';
        }
        else if (sprint_dwi > sprint_wi) {
            colorCode = '#D7003C';
        }
        else {
            colorCode = '#00D5AC';
        }

        line = new LeaderLine(source, destination,
            { startPlug: 'disc', color: colorCode });
        var key = key1 + "-" + key2
        dict[key1].push({ "id": key, "line": line })
        key = key2 + "-" + key1
        dict[key2].push({ "id": key, "line": line })
        allLines.push(line);
    },
    createLines(workItemsWithDependency, areaPath) {
        var workItemsWithDependencyteamwise = DataFilter.getWorkItemsWithDependencyTeamwise(workItemsWithDependency, areaPath)
        workItemsWithDependencyteamwise.forEach(wi => {
            var sprint_wi = (wi["IterationPath"]).replace("Integration Demo Project\\Sprint", "");
            sprint_wi = (sprint_wi).replace("-", "");
            sprint_wi = parseInt(sprint_wi)

            if (wi.DependentOn != undefined && wi.DependentOn.length > 0) {
                wi.DependentOn.forEach(dwi => {

                    var sprint_dwi = (workItemsWithDependency.filter(wis => wis.Id == dwi))[0]["IterationPath"].replace("Integration Demo Project\\Sprint", "");
                    var title_dwi = workItemsWithDependency.filter(wis => wis.Id == dwi)[0]["Title"];
                    sprint_dwi = (sprint_dwi).replace("-", "");
                    sprint_dwi = parseInt(sprint_dwi)

                    key1 = wi.Id
                    key2 = dwi
                    var source = document.getElementById(key1)
                    var destination = document.getElementById(key2)
                    this.drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi);
                })
            }
            if (wi.DependentBy != undefined && wi.DependentBy.length > 0) {
                wi.DependentBy.forEach(dwi => {

                    var sprint_dwi = (workItemsWithDependency.filter(wis => wis.Id == dwi))[0]["IterationPath"].replace("Integration Demo Project\\Sprint", "");
                    var title_dwi = workItemsWithDependency.filter(wis => wis.Id == dwi)[0]["Title"];
                    sprint_dwi = (sprint_dwi).replace("-", "");
                    sprint_dwi = parseInt(sprint_dwi)

                    key1 = wi.Id
                    key2 = dwi
                    var destination = document.getElementById(key1)
                    var source = document.getElementById(key2)
                    this.drawLine(source, destination, sprint_wi, sprint_dwi, title_dwi);
                })
            }

        })
    }
}

module.exports = Line
},{"../dependencyJS/dataFilter":2}],6:[function(require,module,exports){
(function (global){
var DataExtract = require("../dependencyJS/dataExtract")
var DataFilter = require("../dependencyJS/dataFilter")
var Line = require("../dependencyJS/line")
var RenderElement = require("../dependencyJS/render")
var SummaryView = require("../dependencyJS/summaryView")
var ECSClients = require("../dependencyJS/ecsClients")
var Events = require("../dependencyJS/events")

global.dict = {}
global.idArray = []
global.index = 0
global.workItemsObj = []
global.workItemsWithDummy = []
global.witClient;
global.client;
global.contracts;
global.drake;
global.allLines = [];
global.projectId;
global.vstsHostURL;
global.projectName = "Integration Demo Project\\";
global.ecsClientFilter;
global.teamsList;
global.sprintIterations;
global.currentSprint;
global.startSprint;
global.endSprint;

function teamWiseDependencyRender() {

    var workItemsWithDependency = DataFilter.getWorkItemsWithDependencyTeamwise(workItemsWithDummy);
    var workItemsDependentOn = [];
    for (var i = 0; i < workItemsWithDependency.length; i++) {
        workItemsDependentOn = workItemsDependentOn.concat(workItemsWithDependency[i].DependentOn);
    }
    workItemsDependentOn.forEach(element => {

        if (workItemsWithDependency.find(x => x.Id == element) == undefined) {
            var x = workItemsWithDummy.filter(wi => wi.Id == element)[0];

            if (!x["AreaPath"].includes(teamName)) {
                x.DependentBy = [];
                x.DependentOn = [];
                workItemsWithDependency.push(x);
            }
        }
    });

    for (var i = 0; i < workItemsWithDependency.length; i++) {
        if (workItemsWithDependency[i].DependentBy != undefined && workItemsWithDependency[i].DependentBy.length != 0) {

            workItemsWithDependency[i].DependentBy.forEach(element => {
                if (workItemsWithDependency.find(x => x.Id == element) == undefined) {
                    var x = workItemsWithDummy.filter(wi => wi.Id == element)[0];
                    if (!x["AreaPath"].includes(teamName)) {
                        x.DependentBy = [];
                        x.DependentOn = [workItemsWithDependency[i].Id];
                        workItemsWithDependency.push(x);
                    }
                }
            });

        }
    }

    workItemsWithDependency.forEach(wid => {
        dict[wid.Id] = []
    });

    RenderElement.loadTable("#mainTableContainer", workItemsWithDependency)
    Line.createLines(workItemsWithDependency)
}

function dependencyRender() {
    var workItemsWithDependency = DataFilter.getWorkItemsWithDependency(workItemsWithDummy);
    workItemsWithDependency.forEach(wid => {
        dict[wid.Id] = []
    });

    RenderElement.loadTable("#mainTableContainer", workItemsWithDependency)
    Line.createLines(workItemsWithDependency)
}

window.addEventListener('load', function () {
    debugger;
    VSS.init({
        usePlatformScripts: true,
        moduleLoaderConfig: {
            paths: {
                "menu": "menu/scripts"
            }
        }
    });

    VSS.ready(function () {

        // to get context information of user, project and team
        var context = VSS.getWebContext();
        global.vstsHostURL = context.host.uri;
        global.projectId = context.project.id;
        VSS.notifyLoadSucceeded();

    });

    VSS.require(["VSS/Service", "TFS/WorkItemTracking/RestClient", "TFS/WorkItemTracking/Contracts", "TFS/Core/RestClient"], function (VSS_Service, TFS_Wit_WebApi, Contracts, Tfs_Core_WebApi) {
        // Get the REST client
        witClient = VSS_Service.getCollectionClient(TFS_Wit_WebApi.WorkItemTrackingHttpClient);
        client = TFS_Wit_WebApi.getClient();
        clientTeam = VSS_Service.getCollectionClient(Tfs_Core_WebApi.CoreHttpClient4);
        contracts = Contracts;

        drake = dragula({
            moves: (el, source, handle, sibling) => !el.classList.contains('ignoreItem')
        })
            .on('drag', function (el) {
                dict[el.attributes.id.value].forEach(element => {
                    element["line"].dash = { animation: true };
                });
                dict[el.attributes.id.value].forEach(element => {
                    element["line"].position();
                });
            })
            .on('dragend', function (el, container) {
                dict[el.attributes.id.value].forEach(element => {
                    element["line"].dash = false;
                });

                for (key in dict) {
                    dict[key].forEach(element => {
                        element["line"].position();
                    })
                }
            })

        $('#teamDropdownSelect').change(function () {
            debugger;
            var team =  this.value;
            var getteamPromise = helper(team);
            getteamPromise.then(function (data) {
                ecsClientFilter = JSON.parse(data);
                document.getElementById("displayNotMessage").innerHTML = "";
                // can be refactored
                var teamList = ecsClientFilter.DependencyTracker.Teams;
                if (teamList.includes(team) || teamList.includes("*")) {
                    teamId = teamsList.find(x=> x.name == team)
                    var sprintsPromise = DataExtract.getTeamIterations(teamId.id);
                    sprintsPromise.then(function (sprints)
                    {
                        global.sprintIterations = sprints;
                        Events.addIterationDropdownItems(sprints,"sprintStartSelect" , "#sprintStart");
                        Events.addIterationDropdownItems(sprints,"sprintEndSelect" , "#sprintEnd");

                        global.currentSprint - 2 >= 0 ? global.startSprint = global.currentSprint - 2 : global.startSprint = global.sprintIterations[0];
                        global.currentSprint + 2 < global.sprintIterations.length ? global.endSprint = global.currentSprint + 2 : global.endSprint = global.sprintIterations[global.sprintIterations-1];
                        RenderElement.fetchItems(witClient, client, contracts, team, teamId.id);
                    });
                }
                else {
                    document.getElementById("displayNotMessage").innerHTML = "This feature is not supported for selected team!"
                }
            })
        });

        initializeTeamDropDown();
        async function initializeTeamDropDown() {
            debugger;
            var teamLists = await DataExtract.getTeamNames(clientTeam);
            //var sprintList = await DataExtract.getTeamIterations();
            Events.addDropdownItems(teamLists,"teamDropdownSelect" , "#teamDropdown");
        }

        async function helper(team) {
            var url = "https://b.config.skype.net/config/v1/CSE-Teams/1.0.0.0/INT-PLT-EIP-DependencyTracker?Environment=DependencyTracker"
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", url);
                xhr.onload = () => resolve(xhr.responseText);
                xhr.onerror = () => reject(xhr.statusText);
                xhr.send();
            });
        }
    })
    // Button click and scroll events
    $("#mainTableContainer").scroll(function () {
        for (key in dict) {
            dict[key].forEach(element => {
                element["line"].position();
            })
        }
    });

    $("#fullSizeButton").on("click", function () {

        if (document.getElementById("teamGraph").style.display == "" || document.getElementById("teamGraph").style.display == "none") {
            document.getElementById("teamGraph").style.display = "block"
            document.getElementById("hideSection").style.display = "none"
            $('#fullSizeButton').children().html("Dependency View")
        }
        else {

            document.getElementById("teamGraph").style.display = "none"
            document.getElementById("hideSection").style.display = "block"
            $('#fullSizeButton').children().html("Summary view")
        }

    });

});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../dependencyJS/dataExtract":1,"../dependencyJS/dataFilter":2,"../dependencyJS/ecsClients":3,"../dependencyJS/events":4,"../dependencyJS/line":5,"../dependencyJS/render":7,"../dependencyJS/summaryView":8}],7:[function(require,module,exports){
(function (global){
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
        for(var i = global.startSprint; i <= global.endSprint;i++)
        {
            table += "<th><b>"+global.sprintIterations[i]+"</b></th>";
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
        let iterations = global.sprintIterations.slice(global.startSprint , global.endSprint+1);
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

    async fetchItems(witClient, client, Contracts,teamID) {
        var areaPath = await DataExtract.getTeamAreaPath(teamID);

        var workItemsobj = await this.getAllteamDependentItems(witClient, client, Contracts, areaPath);
        var workItemsWithDummy = DataFilter.getWorkItemsWithDummy(workItemsobj, areaPath)

        this.TeamLevelRender(workItemsWithDummy, areaPath);
    },

    async getAllteamDependentItems(witClient, client, Contracts, AreaPath) {
        var workItemsOfTeam = await DataExtract.getWorkItems(witClient, client, Contracts, AreaPath);
        var workItemsOfTeamObj = DataFilter.transformData(workItemsOfTeam)
        var dependentWorkItem = [];

        workItemsOfTeamObj.forEach(wi => {
            if (wi.DependentOn != undefined && wi.DependentOn.length != 0) { dependentWorkItem = dependentWorkItem.concat(wi.DependentOn); }
            if (wi.DependentBy != undefined && wi.DependentBy.length != 0) { dependentWorkItem = dependentWorkItem.concat(wi.DependentBy); }
        });

        var workItemsOfdependentTeam = await DataExtract.getWorkItemsWithID(dependentWorkItem);
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
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../dependencyJS/dataExtract":1,"../dependencyJS/dataFilter":2,"../dependencyJS/line":5,"../dependencyJS/render":7,"../dependencyJS/summaryView":8}],8:[function(require,module,exports){
var DataFilter = require("../dependencyJS/dataFilter")
var SummaryView = {
    createTable(workItemsWithDependency, areaPath) {

        var allTableString = this.createConsumingTable(workItemsWithDependency , areaPath);
        allTableString += this.createProducingTable(workItemsWithDependency , areaPath);
       // allTableString += this.createDummyTable(workItemsWithDependency);

        $("#teamGraph").append(allTableString);
    },

    createConsumingTable(workItemsWithDependency , areaPath) {
        var heading = "<hr><h3>Consuming Dependencies</h3><hr>"
        var tableString = "<table class='summaryTable'><thead><th>Work Item</th><th>Producing Teams</th></thead><tbody>";
        var workItemsWithDependencyteamwise = DataFilter.getWorkItemsWithDependencyTeamwise(workItemsWithDependency , areaPath)
        
        workItemsWithDependencyteamwise.forEach(element => {
            if (element.DependentOn != undefined && element.DependentOn.length != 0) {
                tableString = tableString + "<tr>"

                var producerTeamNames = ""
                var separate = ""
                element.DependentOn.forEach(dependentTeamId => {
                    var workItem = workItemsWithDependency.find(x => x.Id == dependentTeamId)
                    var areaPatharray = workItem["AreaPath"].split("\\")
                    var teamName;
                    areaPatharray.length == 0 ?teamName = workItem["AreaPath"] : teamName = areaPatharray[areaPatharray.length - 1];
                    producerTeamNames = producerTeamNames + separate + teamName
                    separate = " , "
                })

                tableString = tableString + "<td><a class='ms-Link' href='" + element.url + "' target='_blank'>" + element.Title + "</a></td><td>" + producerTeamNames + "</td>";
                tableString = tableString + "</tr>"
            }
        });

        tableString = tableString + "</tbody></table>"

        return heading + tableString;
    },

    createProducingTable(workItemsWithDependency , areaPath) {
        var heading = "<hr><h3>Producing Dependencies</h3><hr>"
        var tableString = "<table class='summaryTable'><thead><th>Work Item</th><th>Consuming Teams</th></thead><tbody>";
        var workItemsWithDependencyteamwise = DataFilter.getWorkItemsWithDependencyTeamwise(workItemsWithDependency , areaPath)

        workItemsWithDependencyteamwise.forEach(element => {
            if (element.DependentBy != undefined && element.DependentBy.length != 0) {
                tableString = tableString + "<tr>"
                
                var ConsumingteamNames = ""
                var separate = ""
                element.DependentBy.forEach(dependentTeamId => {
                    var workItem = workItemsWithDependency.find(x => x.Id == dependentTeamId)
                    var areaPatharray = workItem["AreaPath"].split("\\")
                    var teamName;
                    areaPatharray.length == 0 ?teamName = workItem["AreaPath"] : teamName = areaPatharray[areaPatharray.length - 1];
                    ConsumingteamNames = ConsumingteamNames + separate + teamName
                    separate = " , "
                })

                tableString = tableString + "<td><a class='ms-Link' href='" + element.url + "' target='_blank'>" + element.Title + "</a></td><td>" + ConsumingteamNames + "</td>";
                tableString = tableString + "</tr>"
            }
        });
        tableString = tableString + "</tbody></table>"
        return heading + tableString
    },

    createDummyTable(workItemsWithDependency) {
        var heading = "<hr><h3>Dummy items tagged on us </h3><hr>"
        var dummyDependentBy = workItemsWithDependency.filter(wi => wi.AreaPath.includes(teamName) && wi.Title.includes("[Waiting to create work item]"))

        var tableString = "<table class='summaryTable'><thead><th>Dependent teams</th></thead><tbody>";

        for (element in dummyDependentBy) {
            tableString = tableString + "<tr>"
            var x = workItemsWithDummy.filter(wi => wi.Id == element)[0];
            var teamNames;
            var areaPatharray = dependentTeam["AreaPath"].split("\\")
            areaPatharray.length == 0 ?teamName = dependentTeam["AreaPath"] : teamName = areaPatharray[areaPatharray.length - 1];


            tableString = tableString + "<td>" + teamNames + "</td>"
            tableString = tableString + "</tr>"
        }
        tableString = tableString + "</tbody></table>"

        return heading + tableString
    }
}
module.exports = SummaryView
},{"../dependencyJS/dataFilter":2}]},{},[6]);
