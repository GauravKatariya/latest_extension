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
            iterationPathString = iterationPathString + commaString + "'" + sprintIterationsPath[i] + "'";
            commaString = ",";
        }
        iterationPathString += ")";

        var areaPathString = "(";

        commaString = "";
        for (var index = 0; index < areaPath.length; index++)
        {
            areaPathString = areaPathString + commaString + "'" + areaPath[index] + "'";
            commaString = ",";
        }
        areaPathString += ")";

        var wiqlWhereClauses = ["([System.AreaPath] IN " + areaPathString + " AND [System.IterationPath] IN " + iterationPathString + " AND [System.WorkItemType] IN ('Feature', 'User Story', 'Bug', 'Issue'))"]
        return {
            wiql: "SELECT [System.Id], \n [System.IterationPath], \n [System.TeamProject], \n [System.WorkItemType], \n [System.AssignedTo], \n [System.Title]\n FROM WorkItems\n WHERE " + wiqlWhereClauses
        }
    },

    //Used to extract default Area Path for a team 
    getTeamAreaPath(teamId) {
        return new Promise(function (resolve, reject){
            VSS.require(["TFS/Work/RestClient"], function(WorkRestClient){
                var teamContext = {
                    projectId: global.projectId,
                    teamId: teamId,
                };

                //create work client
                var client = WorkRestClient.getClient();
                var areaPath = [];

                //query the area paths
                client.getTeamFieldValues(teamContext).then(function (settings){
                    areaPath.push(settings.defaultValue);
                    resolve(areaPath);
                });
            });
        });
    },

    // Get all the Area path under the project and provide user to filter the area path
    // Or get the area path under the team and provide filter only for those area path
    // Or for now extract the area paths and use that for all items display instead of user Filter.
    getProjectAreaPaths(teamId) {      
        return new Promise(function (resolve, reject){
            VSS.require(["TFS/Work/RestClient", "TFS/WorkItemTracking/Contracts", "TFS/WorkItemTracking/RestClient"], function(WorkRestClient, Contracts, RestClient){
                var teamContext = {
                    projectId: global.projectId,
                    teamId: teamId,
                };
                   //create work client
                   var client = WorkRestClient.getClient();                   

                   //query the area paths
                   client.getTeamFieldValues(teamContext).then(function (settings){   
                   global.teamDefaultAreaPath = settings.defaultValue;                                
                   var teamDefaultName = settings.defaultValue.replace(global.projectName,"");
                   var teamDefaultNameSplit = teamDefaultName.split("\\");
                   var teamFinalName = "";
                   for (var index = 0; index < teamDefaultNameSplit.length ; index++)
                   {
                       if (teamDefaultNameSplit[index] != "")
                       {
                           teamFinalName += teamDefaultNameSplit[index] + "/";
                       }
                   }
                   var areaPath = [];                                
                   RestClient.getClient().getClassificationNode(global.projectId, Contracts.TreeStructureGroup.Areas , teamFinalName, 1).then(function (val){
                    var areaPathsList = val;
                    if (areaPathsList != undefined && areaPathsList.hasChildren && areaPathsList.children.length > 0)
                    {
                        areaPathsList.children.forEach(element => {
                        areaPath.push(global.teamDefaultAreaPath + "\\" + element.name)                     
                    });
                    
                    resolve(areaPath);
                    }
                  });
               });
            });
        });
    },

    getTeamIterations(teamId) {
        return new Promise(function(resolve, reject){
            VSS.require(["TFS/Work/RestClient"], function(WorkRestClient){
                var teamContext = {
                    projectId: global.projectId,
                    teamId: teamId,
                };
                //create work client
                var client = WorkRestClient.getClient();

                var sprintsArray = []
                var sprintsPathArray = []
                //query the area paths
                client.getTeamIterations(teamContext).then(function (settings){
                    settings.forEach(element => {
                        if (element.attributes.timeFrame == "current" || element.attributes.timeFrame == 1)
                            global.currentSprint = sprintsArray.length;
                        
                        sprintsPathArray = sprintsPathArray.concat(element.path);
                        sprintsArray = sprintsArray.concat(element.name);
                    });

                    resolve( { "sprintsArray" : sprintsArray , "sprintsPathArray" : sprintsPathArray });
                }).catch(function (error) {
                    appInsights.trackException({ "exception": "Failed to get team iterations of team :- " + teamId, "innerException": error })
                    reject(error)
                })
            })
        })
    },
    async getWorkItems(witClient, client, contracts, areaPath) {
        try {
            var wiqlResult = { "query": this.getwiql1(areaPath).wiql }
            var queryResult = await witClient.queryByWiql(wiqlResult, VSS.getWebContext().project.id)

            if (queryResult.workItems.length > 0 && queryResult.workItems.length <= 200) {
                var workItems = await client.getWorkItems(queryResult.workItems.map(function (wi) { return wi.id; }), null, null, contracts.WorkItemExpand.Relations)
                return workItems;
            }
            else if (queryResult.workItems.length > 0 && queryResult.workItems.length > 200)
            {
                var noOfBatches = Math.ceil(queryResult.workItems.length/200);                
                maxNumberOfItems = 200;                
                var workItems = [];
                for (var i = 0; i < noOfBatches; i++)
                {
                    var startindex = i * 200;
                    var endIndex = maxNumberOfItems * (i + 1) - 1;

                    if (endIndex > queryResult.workItems.length - 1)
                    {
                        endIndex = queryResult.workItems.length - 1;
                    }

                    var queryWorkItems = [];
                    for (var index = startindex; index <= endIndex; index++)
                    {
                        queryWorkItems.push(queryResult.workItems[index].id);
                    }

                    var workItemsBatch = await client.getWorkItems(queryWorkItems, null, null, contracts.WorkItemExpand.Relations)
                    workItemsBatch.forEach(element => {
                        workItems.push(element)});
                }
                
                return workItems;
            }
            else{
                return undefined;
            }
        }
        catch (error) {
            throw { "exception": "Failed to get work items of team :- " + areaPath, "innerException": error }
        }
    },

    async getWorkItemsWithID(workItemsID) {
        try {
            var workItems = await client.getWorkItems(workItemsID, null, null, contracts.WorkItemExpand.Relations)
            return workItems;
        }
        catch (error) {
            throw { "exception": "Failed to get workitems :- " + workItemsID, "innerException": error }
        }
    },

    async getTeamNames(client) {
        var maxTeamCount = 5000;
        var countAPIResponse = 1;
        var currentSkip = 0;
        var batchSize = 1000;
        var teamLists = []

        try {
            while (true) {
                teams = await client.getTeams(global.projectId, batchSize, currentSkip)
                // Check if data returned from API is empty
                if (teams == undefined) {
                    countAPIResponse = countAPIResponse + 1;
                    return;
                }
                if(teams.length == 0)
                {
                    return teamLists;
                }
                
                teamLists = teamLists.concat(teams);
                countAPIResponse = countAPIResponse + 1;

                currentSkip += batchSize;
                if (currentSkip >= maxTeamCount || teams.length < batchSize) {
                    break;
                }
            }

            return teamLists;
        }
        catch (error) {
            throw { "exception": "Failed to get Team names from vsts", "innerException": error }
        }
    }
}

module.exports = DataExtract