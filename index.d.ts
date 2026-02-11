export interface InitOptions {
    subdomain: string;
    apiUrl?: string;
    widgetShape?: 'circle' | 'rounded-square';
    widgetSize?: 'small' | 'medium' | 'large';
    [key: string]: any;
}

export function init(config: InitOptions): void;
