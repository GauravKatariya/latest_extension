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

    getTeamIterations()
    {
        return new Promise((resolve, reject) => {
            VSS.require(["TFS/Work/RestClient"], (WorkRestClient) => {
                var teamContext = {
                    projectId: global.projectId,
                    teamId: context.team.name,
                };
                //create work client
                var client = WorkRestClient.getClient();

                //query the area paths
                client.getTeamIterations(teamContext).then((settings) => {
                    resolve(settings);
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