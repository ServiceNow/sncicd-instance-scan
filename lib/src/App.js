"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const axios_1 = __importDefault(require("axios"));
const App_types_1 = require("./App.types");
class App {
    constructor(props) {
        this.TRIGGER_FAIL = 'fail_trigger';
        this.sleepTime = 3000;
        this.errCodeMessages = {
            401: 'The user credentials are incorrect.',
            403: 'Forbidden. The user is not an admin or does not have the CICD role.',
            404: 'Not found. The requested item was not found.',
            405: 'Invalid method. The functionality is disabled.',
            409: 'Conflict. The requested item is not unique.',
            500: 'Internal server error. An unexpected error occurred while processing the request.',
        };
        this.props = props;
        this.user = {
            username: props.username,
            password: props.password,
        };
        this.config = {
            headers: {
                'User-Agent': 'sncicd_extint_github',
                Accept: 'application/json',
            },
            auth: this.user,
        };
    }
    /**
     * Check Request params for validness
     *
     * @param isNotValid    Boolean, expression
     * @throws              Error
     * @returns             void
     */
    checkParamsValidity(isNotValid) {
        if (isNotValid) {
            throw new Error(App_types_1.Errors.NO_PARAMS);
        }
    }
    /**
     * Prepare Request URL
     *
     * @param scantype    String, Default: <empty>
     * @throws            Error
     * @returns           String, Url to API
     */
    getRequestUrl(scantype = '') {
        if (this.props.scan_instance) {
            const baseUrl = `https://${this.props.scan_instance}.service-now.com/api/sn_cicd/instance_scan`;
            let fullUrl;
            switch (scantype) {
                case 'full':
                    fullUrl = baseUrl + '/full_scan';
                    break;
                case 'point':
                    const targetTable = core.getInput('targetTable');
                    const targetSysId = core.getInput('targetSysId');
                    this.checkParamsValidity(!targetTable || !targetSysId);
                    fullUrl = baseUrl + `/point_scan?target_table=${targetTable}&target_sys_id=${targetSysId}`;
                    break;
                case 'suite_combo':
                    const comboSysId = core.getInput('comboSysId');
                    this.checkParamsValidity(!comboSysId);
                    fullUrl = baseUrl + `/suite_scan/combo/${comboSysId}`;
                    break;
                case 'suite_scoped':
                    // requires body-payload
                    const suiteSysIdScoped = core.getInput('suiteSysId');
                    this.checkParamsValidity(!suiteSysIdScoped);
                    fullUrl = baseUrl + `/suite_scan/${suiteSysIdScoped}/scoped_apps`;
                    break;
                case 'suite_update':
                    // requires body-payload
                    const suiteSysIdUpdate = core.getInput('suiteSysId');
                    this.checkParamsValidity(!suiteSysIdUpdate);
                    fullUrl = baseUrl + `/suite_scan/${suiteSysIdUpdate}/update_sets`;
                    break;
                default:
                    throw new Error(App_types_1.Errors.WRONG_SCANTYPE);
            }
            return fullUrl;
        }
        else {
            throw new Error(App_types_1.Errors.NO_SCAN_INSTANCE);
        }
    }
    /**
     * Build Request payload
     *
     * @param source    String
     * @throws          Error
     * @returns         Payload object
     */
    buildRequestPayload(scantype = '') {
        let payload = {};
        let ids = [];
        switch (scantype) {
            case 'suite_scoped':
                ids = core.getInput('appScopeSysIds').split(',');
                payload = {
                    app_scope_sys_ids: ids,
                };
                break;
            case 'suite_update':
                ids = core.getInput('updateSetSysIds').split(',');
                payload = {
                    update_set_sys_ids: ids,
                };
                break;
            default:
                throw new Error(App_types_1.Errors.WRONG_SCANTYPE);
        }
        if (ids.length === 0) {
            throw new Error(App_types_1.Errors.NO_PAYLOAD);
        }
        return payload;
    }
    /**
     * Makes the request to Now batch_install api
     * Prints the progress
     *
     * @returns     Promise void
     */
    async instanceScan() {
        try {
            const scantype = core.getInput('scantype');
            const url = this.getRequestUrl(scantype);
            let payload = {};
            if (scantype === 'suite_update' || scantype === 'suite_scoped') {
                payload = this.buildRequestPayload(scantype);
            }
            if (this.props.debug) {
                core.info(`ScanType=${scantype}, URL=${url}, Payload=${payload}`);
            }
            const response = await axios_1.default.post(url, payload, this.config);
            await this.printStatus(response.data.result);
        }
        catch (error) {
            let message;
            if (error.response && error.response.status) {
                if (this.errCodeMessages[error.response.status]) {
                    message = this.errCodeMessages[error.response.status];
                }
                else {
                    const result = error.response.data.result;
                    message = result.error || result.status_message;
                }
            }
            else {
                message = error.message;
            }
            throw new Error(message);
        }
    }
    /**
     * Some kind of throttling, it used to limit the number of requests
     * in the recursion
     *
     * @param ms    Number of milliseconds to wait
     * @returns     Promise void
     */
    sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }
    /**
     * Print the result of the task.
     * Execution will continue.
     * Task will be working until it get the response with successful or failed or canceled status.
     * Set output rollBackURL variable
     *
     * @param result    TaskResult enum of Succeeded, SucceededWithIssues, Failed, Cancelled or Skipped.
     * @throws          Error
     * @returns         void
     */
    async printStatus(result) {
        if (+result.status === App_types_1.ResponseStatus.Pending) {
            core.info(result.status_label);
        }
        if (+result.status === App_types_1.ResponseStatus.Running || +result.status === App_types_1.ResponseStatus.Successful) {
            core.info(`${result.status_label}: ${result.percent_complete}%`);
        }
        // Recursion to check the status of the request
        if (+result.status < App_types_1.ResponseStatus.Successful) {
            //save result url, query if needed
            const response = await axios_1.default.get(result.links.progress.url, this.config);
            // Throttling
            await this.sleep(this.sleepTime);
            // Call itself if the request in the running or pending state
            await this.printStatus(response.data.result);
        }
        else {
            // for testing only!
            if (process.env.fail === 'true')
                throw new Error('Triggered step fail');
            // Log the success result, the step of the pipeline is success as well
            if (+result.status === App_types_1.ResponseStatus.Successful) {
                core.info(result.status_message);
                core.info(result.status_detail);
            }
            // Log the failed result, the step throw an error to fail the step
            if (+result.status === App_types_1.ResponseStatus.Failed) {
                throw new Error(result.error || result.status_message);
            }
            // Log the canceled result, the step throw an error to fail the step
            if (+result.status === App_types_1.ResponseStatus.Canceled) {
                throw new Error(App_types_1.Errors.CANCELLED);
            }
        }
    }
}
exports.default = App;
