import ld, { LdOptions } from '@api-platform/ld';
import useSWR from 'swr'
import type { SWRConfiguration, KeyedMutator } from 'swr'

export type fetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Fetcher = (...args: any[]) => Promise<any>
export type onUpdateCallback<T> = (root: T, options: { iri: string, data: object }) => void;

export default function useSWRLd<T extends object>(url: string, fetcher: Fetcher, config: Partial<LdOptions<T>>&SWRConfiguration = {}) {
    let cb: undefined|KeyedMutator<T>  = undefined

    const res = useSWR(
      url,
      (url: RequestInfo | URL, opts: RequestInit) => 
        ld(url, {
          ...opts, 
          fetchFn: fetcher, 
          urlPattern: config.urlPattern,
          onUpdate: (root) => cb && cb(root, {optimisticData: root, revalidate: false}),
          relativeURIs: config.relativeURIs,
          onError: config.onError,
        }),
      config
    );

    cb = res.mutate
    return res
}
