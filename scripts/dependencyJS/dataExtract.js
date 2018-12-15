var DataExtract = {

    getwiql(areaPath) {
        var wiqlWhereClauses = ["([System.AreaPath] = '" + areaPath + "')"];
        return {
            wiql: "SELECT [System.Id], \n [System.IterationPath], \n [System.TeamProject], \n [System.WorkItemType], \n [System.AssignedTo], \n [System.Title]\n FROM WorkItems\n WHERE " + wiqlWhereClauses
        };
    },

    // wiql for team specific item fetch
    getwiql1(areaPath) {

        var iterationPathString = "(";
        var commaString = "";
        for (var i = global.startSprint; i <= global.endSprint; i++) {
            iterationPathString = iterationPathString + commaString + "'" + commonIterationPath + sprintIterations[i] + "'";
            commaString = ",";
        }
        iterationPathString += ") )";

        var wiqlWhereClauses = ["([System.AreaPath] = '" + areaPath + "' AND [System.IterationPath] IN " + iterationPathString]
        return {
            wiql: "SELECT [System.Id], \n [System.IterationPath], \n [System.TeamProject], \n [System.WorkItemType], \n [System.AssignedTo], \n [System.Title]\n FROM WorkItems\n WHERE " + wiqlWhereClauses
        }
    },

    //not being used anywhere 
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

    getTeamIterations(teamId) {
        return new Promise((resolve, reject) => {
            VSS.require(["TFS/Work/RestClient"], (WorkRestClient) => {
                var teamContext = {
                    projectId: global.projectId,
                    teamId: teamId,
                };
                //create work client
                var client = WorkRestClient.getClient();

                var sprintsArray = []
                var fullIterationPath;
                //query the area paths
                client.getTeamIterations(teamContext).then((settings) => {
                    settings.forEach(element => {
                        if (element.attributes.timeFrame == "current" || element.attributes.timeFrame == 1)
                            global.currentSprint = sprintsArray.length;
                        fullIterationPath = element.path;
                        sprintsArray = sprintsArray.concat(element.name);
                    });

                    var splitIterationPath = fullIterationPath.split("\\");
                    fullIterationPath = ""
                    for (var i = 0; i < splitIterationPath.length - 1; i++) {
                        fullIterationPath += splitIterationPath[i] + "\\";
                    }

                    global.commonIterationPath = fullIterationPath;
                    resolve(sprintsArray);
                }).catch(function (error) {
                    window.appInsights.trackException({ "exception": "Failed to get team iterations of team :- " + teamId, "innerException": error })
                    reject(error)
                })
            })
        })
    },
    async getWorkItems(witClient, client, contracts, areaPath) {
        try {
            var wiqlResult = { "query": this.getwiql1(areaPath).wiql }
            var queryResult = await witClient.queryByWiql(wiqlResult, VSS.getWebContext().project.id)

            if (queryResult.workItems.length > 0) {
                var workItems = await client.getWorkItems(queryResult.workItems.map(function (wi) { return wi.id; }), null, null, contracts.WorkItemExpand.Relations)
                return workItems;
            }
        }
        catch (error) {
            window.appInsights.trackException({ "exception": "Failed to get work items of team :- " + areaPath, "innerException": error })
        }
    },

    async getWorkItemsWithID(workItemsID) {
        try {
            var workItems = await client.getWorkItems(workItemsID, null, null, contracts.WorkItemExpand.Relations)
            return workItems;
        }
        catch (error) {
            window.appInsights.trackException({ "exception": "Failed to get workitems :- " + workItemsID, "innerException": error })
        }
    },

    async getTeamNames(client) {
        var maxTeamCount = 50;
        var countAPIResponse = 1;
        var currentSkip = 0;
        var batchSize = 50;
        var teamLists = []

        try {
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
        catch (error) {
            window.appInsights.trackException({ "exception": "Failed to get Team names from vsts", "innerException": error })
            return undefined;
        }
    }
}

module.exports = DataExtract