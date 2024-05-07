import esa from 'esa';
import useSWR from 'swr'
import type { SWRConfiguration } from 'swr'

export type fetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Fetcher = (...args: any[]) => Promise<any>

export default function useSWRESA(url: string, pattern: URLPattern, fetcher: Fetcher, config: SWRConfiguration = {}) {
    if (!fetcher) {
      fetcher = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init).then(res => res.json())
    }

    let cb: any = undefined
    const esaFetcher = (...args: any[]) => fetcher(...args)
    .then((data: any) => {
      return esa(data, pattern, {
        fetchFn: fetcher as fetchFn,
        callback: (root) => {
          cb && cb(root, {optimisticData: root, revalidate: false})
        }
      })
    })

    const res = useSWR(
      "https://localhost/books",
      esaFetcher,
      config
    );

    cb = res.mutate
    return res
}
