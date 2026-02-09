export interface InitOptions {
    subdomain: string;
    apiUrl?: string;
    [key: string]: any;
}

export function init(config: InitOptions): void;
