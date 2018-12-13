var ECS = require("../../node_modules/@skype/ecsclient");
var SyncTasks = require("../../node_modules/synctasks");

var ECSClient = {
    _getSlimcoreParameters() {
        return SyncTasks.Resolved({ 'Environment': 'Staging' });
    },
    async getConfig() {
        if (ECS.getConfig()) {
            return SyncTasks.Resolved(ECS.getConfig());
        }
        var deferred = SyncTasks.Defer();
        // Subscribe to changes to wait for a config
        var subToken = ECS.configUpdated.subscribe(function () {
            var x = ECS.getConfig();
            if (x) {
                deferred.resolve(ECS.getConfig());
            }
        });
        return deferred.promise();
    },
    async fetchClientConfig() {
        var ecsClientConfig = {
            hosts: ['https://a.config.skype.net', 'https://b.config.skype.net'],
            clientName: 'CSE-Teams',
            clientVersion: '1.0.0.0',
            configsToFetch: [ECS.Models.EcsConfigType.Default],
            initialAppActiveState: true,
            getEcsParameters: this._getSlimcoreParameters()
        };

        return await this.getConfig();
    }
}
module.exports = ECSClient

