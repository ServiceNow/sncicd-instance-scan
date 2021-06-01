import * as core from '@actions/core'
import { AppProps, Errors } from './src/App.types'
import App from './src/App'

export const configMsg = '. Configure Github secrets please'

export const run = (): void => {
    try {
        const errors: string[] = []
        const { nowUsername = '', nowPassword = '', nowScanInstance = '', nowDebug = '' } = process.env

        if (!nowUsername) {
            errors.push(Errors.USERNAME)
        }
        if (!nowPassword) {
            errors.push(Errors.PASSWORD)
        }
        if (!nowScanInstance) {
            errors.push(Errors.NO_SCAN_INSTANCE)
        }

        if (errors.length) {
            core.setFailed(`${errors.join('. ')}${configMsg}`)
        } else {
            const props: AppProps = {
                username: nowUsername,
                password: nowPassword,
                scan_instance: nowScanInstance,
                debug: nowDebug === 'true' ? true : false,
            }
            const app = new App(props)

            app.instanceScan().catch(error => {
                core.setFailed(error.message)
            })
        }
    } catch (error) {
        core.setFailed(error.message)
    }
}

run()
