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
