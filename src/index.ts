import { show_object } from "./lib/bfu.js";

export interface FormatOptions {
  title: string;
  includeJavaScript: boolean;
  hideFunctions: boolean;
  depthLimit: number;
}

const isError = (e: any) => {
  return (
    e &&
    e.stack &&
    e.message &&
    typeof e.stack === "string" &&
    typeof e.message === "string"
  );
};

function dumpableError(err: any) {
  if (isError(err)) {
    const result = Object.getOwnPropertyNames(err).reduce(
      (acc: any, key: string) => {
        acc[key] = err[key];
        return acc;
      },
      {}
    );
    result.stack = result.stack.split("\n");
    return result;
  } else {
    return { ...err };
  }
}

export function objectToHtml(obj: any, options?: FormatOptions): string {
  obj = dumpableError(obj);
  return show_object(options?.title ? options?.title : "Object", obj);
}
