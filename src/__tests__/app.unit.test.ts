// import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals'
import * as core from '@actions/core'
import axios from 'axios'
import App from '../App'
import { AppProps, Errors, ScanResult, Payload } from '../App.types'

describe(`Scan Action`, () => {
    let props: AppProps
    let baseUrl: string
    let inputs: Record<string, string>

    beforeAll(() => {
        jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
            return inputs[name]
        })

        // Mock error/warning/info/debug
        jest.spyOn(core, 'error').mockImplementation(jest.fn())
        jest.spyOn(core, 'warning').mockImplementation(jest.fn())
        jest.spyOn(core, 'info').mockImplementation(jest.fn())
        jest.spyOn(core, 'debug').mockImplementation(jest.fn())
    })

    beforeEach(() => {
        props = { password: '2', scan_instance: 'test', username: '1' }
        baseUrl = `https://${props.scan_instance}.service-now.com/api/sn_cicd/instance_scan`

        inputs = {
            scantype: 'full', // point, suite_combo, suite_scoped, suite_update
            targetTable: 'abc',
            targetSysId: '123',
            comboSysId: '456',
            suiteSysId: '789',
            appScopeSysIds: '123,456',
            updateSetSysIds: '456,789',
        }
    })

    describe(`Building Request URL`, () => {
        // FULL scantype
        it(`should build correct URL with FULL scantype`, () => {
            const app = new App(props)

            expect(app.getRequestUrl('full')).toEqual(`${baseUrl}/full_scan`)
        })

        // POINT scantype
        it(`should build correct URL with POINT scantype`, () => {
            const app = new App(props)

            expect(app.getRequestUrl('point')).toEqual(
                `${baseUrl}/point_scan?target_table=${inputs.targetTable}&target_sys_id=${inputs.targetSysId}`,
            )
        })
        it(`should throw an Error with POINT scantype if missed request values`, () => {
            const app = new App(props)
            inputs.targetTable = ''

            expect(() => app.getRequestUrl('point')).toThrow(Errors.NO_PARAMS)
        })

        // SUITE_COMBO scantype
        it(`should build correct URL with SUITE_COMBO scantype`, () => {
            const app = new App(props)

            expect(app.getRequestUrl('suite_combo')).toEqual(`${baseUrl}/suite_scan/combo/${inputs.comboSysId}`)
        })
        it(`should throw an Error with SUITE_COMBO scantype if missed request values`, () => {
            const app = new App(props)
            inputs.comboSysId = ''

            expect(() => app.getRequestUrl('suite_combo')).toThrow(Errors.NO_PARAMS)
        })

        // SUITE_SCOPED scantype
        it(`should build correct URL with SUITE_SCOPED scantype`, () => {
            const app = new App(props)

            expect(app.getRequestUrl('suite_scoped')).toEqual(`${baseUrl}/suite_scan/${inputs.suiteSysId}/scoped_apps`)
        })
        it(`should throw an Error with SUITE_SCOPED scantype if missed request values`, () => {
            const app = new App(props)
            inputs.suiteSysId = ''

            expect(() => app.getRequestUrl('suite_scoped')).toThrow(Errors.NO_PARAMS)
        })

        // SUITE_UPDATE scantype
        it(`should build correct URL with SUITE_UPDATE scantype`, () => {
            const app = new App(props)

            expect(app.getRequestUrl('suite_update')).toEqual(`${baseUrl}/suite_scan/${inputs.suiteSysId}/update_sets`)
        })
        it(`should throw an Error with SUITE_UPDATE scantype if missed request values`, () => {
            const app = new App(props)
            inputs.suiteSysId = ''

            expect(() => app.getRequestUrl('suite_update')).toThrow(Errors.NO_PARAMS)
        })

        it(`should fail without instance parameter`, () => {
            props.scan_instance = ''
            const app = new App(props)

            expect(() => app.getRequestUrl()).toThrow(Errors.NO_SCAN_INSTANCE)
        })

        it(`should fail with wrong scantype`, () => {
            const app = new App(props)

            expect(() => app.getRequestUrl('wrong_scantype')).toThrow(Errors.WRONG_SCANTYPE)
        })
    })

    describe(`Params validation`, () => {
        it(`should FAIL with true`, () => {
            const app = new App(props)
            expect(() => app.checkParamsValidity(true)).toThrow(Errors.NO_PARAMS)
        })

        it(`should FAIL with one empty string`, () => {
            const app = new App(props)
            expect(() => app.checkParamsValidity(!'' || !'abc')).toThrow(Errors.NO_PARAMS)
        })

        it(`should SUCCEED with false`, () => {
            const app = new App(props)
            expect(() => app.checkParamsValidity(false)).not.toThrow(Errors.NO_PARAMS)
        })
    })

    describe(`Build Request Payload`, () => {
        it(`should fail with wrong scantype`, () => {
            const app = new App(props)

            expect(() => app.buildRequestPayload('wrong_scantype')).toThrow(Errors.WRONG_SCANTYPE)
        })

        it(`should build right payload with SUITE_SCOPED scantype`, () => {
            const app = new App(props)
            const expectedPayload: Payload = {
                app_scope_sys_ids: ['123', '456'],
            }
            const actualPayload: Payload = app.buildRequestPayload('suite_scoped')

            expect(actualPayload).toEqual(expectedPayload)
        })

        it(`should build right payload with SUITE_UPDATE scantype`, () => {
            const app = new App(props)
            const expectedPayload: Payload = {
                update_set_sys_ids: ['456', '789'],
            }
            const actualPayload: Payload = app.buildRequestPayload('suite_update')

            expect(actualPayload).toEqual(expectedPayload)
        })
    })

    describe(`Instance Scan`, () => {
        it(`should call functions`, () => {
            const app = new App(props)
            const post = jest.spyOn(axios, 'post')
            const getRequestUrl = jest
                .spyOn(app, 'getRequestUrl')
                .mockImplementation(() => 'https://test.service-now.com/api/sn_cicd/instance_scan/full_scan')
            const buildRequestPayload = jest.spyOn(app, 'buildRequestPayload')

            const response: ScanResult = {
                links: {
                    progress: {
                        id: '1',
                        url: 'https://example.com/1',
                    },
                },
                status: '1',
                status_label: 'string',
                status_message: 'string',
                status_detail: 'string',
                error: 'string',
                percent_complete: '100',
            }
            post.mockResolvedValue(response)

            app.instanceScan()

            expect(getRequestUrl).toHaveBeenCalledTimes(1)
            expect(buildRequestPayload).not.toHaveBeenCalled()
            expect(post).toHaveBeenCalled()
        })
    })
})
