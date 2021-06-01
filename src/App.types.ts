export interface User {
    username: string;
    password: string;
}

export interface AppProps extends User {
    scan_instance: string;
    debug?: boolean;
}


export interface Payload {
    app_scope_sys_ids?: string[],
    update_set_sys_ids?: string[],
}

export interface ErrorResult {
    status: string;
    status_label: string;
    status_message: string;
    status_detail: string;
    error: string;
}

export enum Errors {
    USERNAME = 'nowUsername is not set',
    PASSWORD = 'nowPassword is not set',
    NO_SCAN_INSTANCE = 'nowScanInstance is not set',
    NO_PARAMS = 'Request params are wrong or not defied',
    WRONG_SCANTYPE = 'Scan type is not supported',
    CANCELLED = 'Canceled',
    NO_PAYLOAD = 'Payload is not provided.',
}


export interface ScanResponse {
    data: {
        result: ScanResult,
    };
}

export interface ScanResult {
    links: {
        progress: {
            id: string,
            url: string,
        },
    };
    status: string;
    status_label: string;
    status_message: string;
    status_detail: string;
    error: string;
    percent_complete?: string;
}

export enum ResponseStatus {
    Pending = 0,
    Running = 1,
    Successful = 2,
    Failed = 3,
    Canceled = 4,
}

export interface axiosConfig {
    headers: {
        'User-Agent': string,
        Accept: string,
    };
    auth: User;
}
