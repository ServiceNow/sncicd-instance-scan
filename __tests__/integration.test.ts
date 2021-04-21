import * as core from '@actions/core'
import { configMsg, run } from '../index'
import { Errors } from '../src/App.types'

describe('Install app', () => {
    const original = process.env
    const envs = { nowPassword: 'test', nowInstallInstance: 'test', nowUsername: 'test' }
    beforeEach(() => {
        jest.resetModules()
        jest.clearAllMocks()
        process.env = { ...original, ...envs }
        jest.spyOn(core, 'setFailed')
    })
    it('fails without creds', () => {
        // simulate the secrets are not set
        process.env = {}
        const errors = [Errors.USERNAME, Errors.PASSWORD, Errors.NO_SCAN_INSTANCE].join('. ')

        run()

        expect(core.setFailed).toHaveBeenCalledWith(`${errors}${configMsg}`)
    })

    it('username and password without instance', () => {
        // simulate the secrets are not fully set
        process.env.nowScanInstance = ''
        const errors = [Errors.NO_SCAN_INSTANCE].join('. ')

        run()

        expect(core.setFailed).toHaveBeenCalledWith(`${errors}${configMsg}`)
    })

    it('success with creds', () => {
        run()
        expect(core.setFailed).not.toHaveBeenCalled()
    })
})
