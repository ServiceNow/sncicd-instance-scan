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
exports.run = exports.configMsg = void 0;
const core = __importStar(require("@actions/core"));
const App_types_1 = require("./src/App.types");
const App_1 = __importDefault(require("./src/App"));
exports.configMsg = '. Configure Github secrets please';
const run = () => {
    try {
        const errors = [];
        const { nowUsername = '', nowPassword = '', nowScanInstance = '', nowDebug = '' } = process.env;
        if (!nowUsername) {
            errors.push(App_types_1.Errors.USERNAME);
        }
        if (!nowPassword) {
            errors.push(App_types_1.Errors.PASSWORD);
        }
        if (!nowScanInstance) {
            errors.push(App_types_1.Errors.NO_SCAN_INSTANCE);
        }
        if (errors.length) {
            core.setFailed(`${errors.join('. ')}${exports.configMsg}`);
        }
        else {
            const props = {
                username: nowUsername,
                password: nowPassword,
                scan_instance: nowScanInstance,
                debug: nowDebug === 'true' ? true : false,
            };
            const app = new App_1.default(props);
            app.instanceScan().catch(error => {
                core.setFailed(error.message);
            });
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
};
exports.run = run;
exports.run();
