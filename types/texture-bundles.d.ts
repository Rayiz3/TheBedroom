declare module 'virtual:texture-bundles' {
  export type TextureBundle = {
    name: string;
    paths: [string, string, string, string, string];
  };

  const textureBundles: TextureBundle[];
  export const canRefresh: boolean;
  export default textureBundles;
}
