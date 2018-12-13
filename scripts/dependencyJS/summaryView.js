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