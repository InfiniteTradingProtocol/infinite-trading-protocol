export declare enum HttpMethod {
    Get = "get",
    Post = "post",
    Delete = "delete"
}
interface HttpRequest {
    url: string;
    method: HttpMethod;
    body?: any;
}
export declare function sendRequest<T>({ url, method, body }: HttpRequest): Promise<T>;
export {};
