import {
    __federation_method_setRemote,
    __federation_method_getRemote
}
    // @ts-ignore
    from '__federation__'

/**
 * Dynamically loads a remote module exposed via Vite Module Federation.
 * @param url Full URL to the remote's `remoteEntry.js` file
 * @param scope Scope name defined in the remote's federation config
 * @param module Module path exposed by the remote (e.g. './Button')
 * @returns The loaded module (usually the React component)
 */
export const loadRemote = async (
    url: string,
    scope: string,
    module: string
): Promise<any> => {
    // Register the remote
    __federation_method_setRemote(scope, {
        url,
        format: 'esm',   // because Vite uses ES modules
        from: 'vite',     // Vite context
    })

    // Load the remote module
    const mod = await __federation_method_getRemote(scope, module)
    return mod
}
