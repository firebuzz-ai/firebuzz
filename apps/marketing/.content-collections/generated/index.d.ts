import configuration from "../../content-collections.ts";
import { GetTypeByName } from "@content-collections/core";

export type Post = GetTypeByName<typeof configuration, "posts">;
export declare const allPosts: Array<Post>;

export type PostCategory = GetTypeByName<typeof configuration, "postCategories">;
export declare const allPostCategories: Array<PostCategory>;

export type Author = GetTypeByName<typeof configuration, "authors">;
export declare const allAuthors: Array<Author>;

export type Changelog = GetTypeByName<typeof configuration, "changelogs">;
export declare const allChangelogs: Array<Changelog>;

export {};
