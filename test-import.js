import { init } from './index.js';

if (typeof init === 'function') {
    console.log('SDK exports init function successfully.');
} else {
    console.error('SDK failed to export init function.');
    process.exit(1);
}

global.window = {
    RAGGED_CONFIG: {}
};
global.document = {
    readyState: 'complete',
    addEventListener: () => { },
    createElement: () => ({ style: {}, classList: { add: () => { }, remove: () => { } }, addEventListener: () => { } }),
    body: { appendChild: () => { } },
    getElementById: () => ({ addEventListener: () => { } })
};
global.fetch = async () => ({ json: async () => ({}) });

try {
    init({ subdomain: 'test-bot' });
    console.log('SDK init function runs without immediate crashing.');
} catch (e) {
    console.error('SDK init function crashed:', e);
    process.exit(1);
}
