var DataFilter = {
    transformData(allWI) {
        allWI = allWI.map(wi => ({
            "Title": wi.fields["System.Title"],
            "Id": wi.id,
            "AreaPath": wi.fields["System.AreaPath"],
            "IterationPath": wi.fields["System.IterationPath"],
            "DependentOn": wi.relations != undefined ? wi.relations.filter(relation => relation.rel.includes("Dependency-Reverse")).map(item => parseInt(item.url.replace(global.vstsHostURL + "_apis/wit/workItems/", ""))) : undefined,
            "DependentBy": wi.relations != undefined ? wi.relations.filter(relation => relation.rel.includes("Dependency-Forward")).map(item => parseInt(item.url.replace(global.vstsHostURL + "_apis/wit/workItems/", ""))) : undefined,
            "WorkItemType": wi.fields["System.WorkItemType"],
            "url": global.vstsHostURL + "_workitems/edit/" + wi.id
        }))
        return allWI
    },

    getWorkItemsWithDummy(allWI, dependentWorkItemsList, areaPaths) {

        var wiDependenciesInTitle = []
        areaPaths.forEach(areaPath => {
            var dummyItemsList = allWI.filter(wi => wi.Title.includes("[Dependency]") && wi.AreaPath.includes(areaPath))
            dummyItemsList.forEach(item => {
                wiDependenciesInTitle.push(item)
            });
        });
        
        var itemsToBeProcessed = [];
        if (dependentWorkItemsList != undefined && dependentWorkItemsList.length != 0)
        {
            itemsToBeProcessed = dependentWorkItemsList.filter(wi => !wiDependenciesInTitle.find(wis => wis.Id == wi.Id))
        }
        
        wiDependenciesInTitle.forEach(element => {
            itemsToBeProcessed.push(
                {
                    "Title": "[Waiting to create work item]",
                    "Id": element.Id + "0",
                    "AreaPath": "Dummy_Area_path\\" + ((element.Title.split("]"))[1]).substring(1),
                    "IterationPath": "Dummy_iteration_path\\" + global.sprintIterations[global.startSprint],
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
        var wiHavingDependencies = allWI.filter(wi => (wi.DependentBy != undefined && wi.DependentBy.length != 0) || (wi.DependentOn != undefined && wi.DependentOn.length != 0));
        return wiHavingDependencies
    },

    getWorkItemsWithDependencyTeamwise(allWI, areaPath) {
        var wiHavingDependencies = allWI.filter(wi => wi.AreaPath.includes(areaPath) && ((wi.DependentBy != undefined && wi.DependentBy.length != 0) || (wi.DependentOn != undefined && wi.DependentOn.length != 0)));
        var wiHavingDependenciesSprintWise = []
        let iterations = global.sprintIterations.slice(global.startSprint, global.endSprint + 1);

        wiHavingDependencies.forEach(wi => {
            for(var i = 0 ; i<iterations.length; i++){
                if (wi.IterationPath.includes(iterations[i])) {
                    wiHavingDependenciesSprintWise = wiHavingDependenciesSprintWise.concat(wi);
                    break;
                }
            }
        });
        return wiHavingDependenciesSprintWise;
    }
}

module.exports = DataFilter