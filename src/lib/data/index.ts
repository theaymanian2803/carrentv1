import { apiAdapter } from "./api";
import type { DataClient } from "./types";

/**
 * The active data adapter. The Normal (Turso-direct) build replaces this
 * export with `directAdapter`; every hook imports `data` only.
 */
export const data: DataClient = apiAdapter;
