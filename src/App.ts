import * as core from '@actions/core'
import axios from 'axios'

import {
    ScanResult,
    AppProps,
    axiosConfig,
    Errors,
    Payload,
    ScanResponse,
    ResponseStatus,
    User,
    ErrorResult,
} from './App.types'

export default class App {
    TRIGGER_FAIL = 'fail_trigger'
    sleepTime = 3000
    user: User
    config: axiosConfig
    props: AppProps
    errCodeMessages: Record<number, string> = {
        401: 'The user credentials are incorrect.',
        403: 'Forbidden. The user is not an admin or does not have the CICD role.',
        404: 'Not found. The requested item was not found.',
        405: 'Invalid method. The functionality is disabled.',
        409: 'Conflict. The requested item is not unique.',
        500: 'Internal server error. An unexpected error occurred while processing the request.',
    }

    constructor(props: AppProps) {
        this.props = props
        this.user = {
            username: props.username,
            password: props.password,
        }
        this.config = {
            headers: {
                'User-Agent': 'sncicd_extint_github',
                Accept: 'application/json',
            },
            auth: this.user,
        }
    }

    /**
     * Check Request params for validness
     *
     * @param isNotValid    Boolean, expression
     * @throws              Error
     * @returns             void
     */
    checkParamsValidity(isNotValid: boolean): void {
        if (isNotValid) {
            throw new Error(Errors.NO_PARAMS)
        }
    }

    /**
     * Prepare Request URL
     *
     * @param scantype    String, Default: <empty>
     * @throws            Error
     * @returns           String, Url to API
     */
    getRequestUrl(scantype = ''): string {
        if (this.props.scan_instance) {
            const baseUrl = `https://${this.props.scan_instance}.service-now.com/api/sn_cicd/instance_scan`
            let fullUrl, targetTable, targetSysId, comboSysId, suiteSysIdScoped, suiteSysIdUpdate: string

            switch (scantype) {
                case 'full':
                    fullUrl = baseUrl + '/full_scan'
                    break
                case 'point':
                    targetTable = core.getInput('targetTable')
                    targetSysId = core.getInput('targetSysId')
                    this.checkParamsValidity(!targetTable || !targetSysId)
                    fullUrl = baseUrl + `/point_scan?target_table=${targetTable}&target_sys_id=${targetSysId}`
                    break
                case 'suite_combo':
                    comboSysId = core.getInput('comboSysId')
                    this.checkParamsValidity(!comboSysId)
                    fullUrl = baseUrl + `/suite_scan/combo/${comboSysId}`
                    break
                case 'suite_scoped':
                    // requires body-payload
                    suiteSysIdScoped = core.getInput('suiteSysId')
                    this.checkParamsValidity(!suiteSysIdScoped)
                    fullUrl = baseUrl + `/suite_scan/${suiteSysIdScoped}/scoped_apps`
                    break
                case 'suite_update':
                    // requires body-payload
                    suiteSysIdUpdate = core.getInput('suiteSysId')
                    this.checkParamsValidity(!suiteSysIdUpdate)
                    fullUrl = baseUrl + `/suite_scan/${suiteSysIdUpdate}/update_sets`
                    break
                default:
                    throw new Error(Errors.WRONG_SCANTYPE)
            }

            return fullUrl
        } else {
            throw new Error(Errors.NO_SCAN_INSTANCE)
        }
    }

    /**
     * Build Request payload
     *
     * @param source    String
     * @throws          Error
     * @returns         Payload object
     */
    buildRequestPayload(scantype = ''): Payload {
        let payload: Payload = {}
        let ids: string[] = []

        switch (scantype) {
            case 'suite_scoped':
                ids = core.getInput('appScopeSysIds').split(',')
                payload = {
                    app_scope_sys_ids: ids,
                }
                break
            case 'suite_update':
                ids = core.getInput('updateSetSysIds').split(',')
                payload = {
                    update_set_sys_ids: ids,
                }
                break
            default:
                throw new Error(Errors.WRONG_SCANTYPE)
        }

        return payload
    }

    /**
     * Makes the request to Now batch_install api
     * Prints the progress
     *
     * @returns     Promise void
     */
    async instanceScan(): Promise<void | never> {
        try {
            const scantype: string = core.getInput('scantype')
            const url: string = this.getRequestUrl(scantype)
            let payload: Payload = {}

            if (scantype === 'suite_update' || scantype === 'suite_scoped') {
                payload = this.buildRequestPayload(scantype)
            }

            if (this.props.debug) {
                core.info(`ScanType=${scantype}, URL=${url}, Payload=${payload}`)
            }

            const response: ScanResponse = await axios.post(url, payload, this.config)
            await this.printStatus(response.data.result)
        } catch (error) {
            let message: string
            if (error.response && error.response.status) {
                if (this.errCodeMessages[error.response.status]) {
                    message = this.errCodeMessages[error.response.status]
                } else {
                    const result: ErrorResult = error.response.data.result
                    message = result.error || result.status_message
                }
            } else {
                message = error.message
            }
            throw new Error(message)
        }
    }

    /**
     * Some kind of throttling, it used to limit the number of requests
     * in the recursion
     *
     * @param ms    Number of milliseconds to wait
     * @returns     Promise void
     */
    sleep(ms: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(resolve, ms)
        })
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
    async printStatus(result: ScanResult): Promise<void> {
        if (+result.status === ResponseStatus.Pending) {
            core.info(result.status_label)
        }

        if (+result.status === ResponseStatus.Running || +result.status === ResponseStatus.Successful) {
            core.info(`${result.status_label}: ${result.percent_complete}%`)
        }

        // Recursion to check the status of the request
        if (+result.status < ResponseStatus.Successful) {
            //save result url, query if needed

            const response: ScanResponse = await axios.get(result.links.progress.url, this.config)
            // Throttling
            await this.sleep(this.sleepTime)
            // Call itself if the request in the running or pending state
            await this.printStatus(response.data.result)
        } else {
            // for testing only!
            if (process.env.fail === 'true') throw new Error('Triggered step fail')
            // Log the success result, the step of the pipeline is success as well
            if (+result.status === ResponseStatus.Successful) {
                core.info(result.status_message)
                core.info(result.status_detail)
            }

            // Log the failed result, the step throw an error to fail the step
            if (+result.status === ResponseStatus.Failed) {
                throw new Error(result.error || result.status_message)
            }

            // Log the canceled result, the step throw an error to fail the step
            if (+result.status === ResponseStatus.Canceled) {
                throw new Error(Errors.CANCELLED)
            }
        }
    }
}
