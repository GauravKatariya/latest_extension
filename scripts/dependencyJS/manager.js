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
global.projectName;
global.teamDefaultAreaPath;
global.vstsHostURL;
global.ecsClientFilter;
global.teamsList;
global.sprintIterations;
global.currentSprint;
global.startSprint;
global.endSprint;
global.selectedTeamId;
global.sprintIterationsPath;
global.skipList = [];

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
        global.projectName = context.project.name;
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
        $(document).ready(function () {
            $("#teamsSelectionDropDown").select2({
                placeholder: 'Select a team'
            });
            $("#sprintStartDropDown").select2({
                placeholder: 'select start sprint'
            });
            $("#sprintEndDropDown").select2({
                placeholder: 'select end sprint'
            });
        });

        $(document).ready(function () {
            $('#teamsSelectionDropDown').on('select2:select', function (value) {
                var team = value.params.data.id;
                if (team == "")
                    return
                var getteamPromise = httpGetToECS(team);
                getteamPromise.then(function (data) {
                    ecsClientFilter = JSON.parse(data);
                    var teamList = ecsClientFilter.DependencyTracker.Teams;

                    // restting the view 
                    Events.clearScreen();
                    Events.clearLines();
                    Events.disableSprintDropdown();

                    if (teamList.includes(team) || teamList.includes("*")) {
                        teamId = teamsList.find(x => x.name == team)
                        global.selectedTeamId = teamId.id;
                        var sprintsPromise = DataExtract.getTeamIterations(teamId.id);

                        sprintsPromise.then(function (sprints) {
                            global.sprintIterations = sprints.sprintsArray;
                            global.sprintIterationsPath = sprints.sprintsPathArray;

                            global.currentSprint - 2 >= 0 ? global.startSprint = global.currentSprint - 2 : global.startSprint = 0;
                            global.currentSprint + 2 < global.sprintIterations.length ? global.endSprint = global.currentSprint + 2 : global.endSprint = global.sprintIterations.length - 1;

                            Events.addIterationDropdownItems(global.sprintIterations, "sprintStartDropDown", global.sprintIterations[global.startSprint]);
                            Events.addIterationDropdownItems(global.sprintIterations, "sprintEndDropDown", global.sprintIterations[global.endSprint]);
                            RenderElement.fetchItems(witClient, client, contracts, teamId.id);
                            Events.enableButton();
                            Events.showDependencyContainer();
                        }).catch(function (error) {
                            Events.showErrorMessage();
                            Events.disableButton();
                        })
                    }
                    else {
                        Events.disableButton();
                        appInsights.trackEvent("Team tried accessing :- " + team)
                        Events.hideDependencyContainer();
                        document.getElementById("displayNotMessage").innerHTML = "This feature is not supported for selected team!"
                    }
                }).catch(function (error) {
                    appInsights.trackException({ "exception": "Failed to get ECS config", "innerException": error })
                    Events.showErrorMessage()
                })
            });
        });

        initializeTeamDropDown();
        async function initializeTeamDropDown() {
            var teamLists = await DataExtract.getTeamNames(clientTeam);

            if (teamLists != undefined) {
                Events.addDropdownItems(teamLists, "teamsSelectionDropDown");
                Events.hideDependencyContainer();
                Events.disableButton();
                Events.hideDependencyContainer();
                Events.clearScreen();
                Events.clearLines();
                Events.disableSprintDropdown();
                document.getElementById("displayNotMessage").innerHTML = "Please select the team"
            } else {
                Events.showErrorMessage();
            }
        }

        async function httpGetToECS(team) {
            var url = "";

            if (global.vstsHostURL.includes('msit-test1'))
            {
                url = "https://s2s.config.skype.com/config/v1/CSE-Teams/1.0.0.0/BAP-INT-DependencyTracker?Environment=Staging"
            }
            else
            {
                url = "https://s2s.config.skype.com/config/v1/CSE-Teams/1.0.0.0/BAP-INT-DependencyTracker?Environment=Production"
            } 

            return new Promise(function (resolve, reject){
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
        Events.reRenderLines();
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
            $('#fullSizeButton').children().html("Summary")
            Events.reRenderLines();
        }

    });

    $("#goButton").on("click", function () {
        Events.clearScreen();
        Events.clearLines();
        global.startSprint = global.sprintIterations.indexOf($('#sprintStartDropDown').val())
        global.endSprint = global.sprintIterations.indexOf($('#sprintEndDropDown').val())

        if(sprintIterations[global.startSprint] > sprintIterations[global.endSprint])
        {
            appInsights.trackEvent("Sprint start is greater than sprint end " + global.selectedTeamId)
            
            Events.hideDependencyContainer();
            document.getElementById("displayNotMessage").innerHTML = "Sprint end should be later than sprint start"
            return;
        }

        Events.showDependencyContainer();
        RenderElement.fetchItems(witClient, client, contracts, global.selectedTeamId);
    });

});
