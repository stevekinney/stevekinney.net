import { hydrateShadowRoots } from '@webcomponents/template-shadowroot';

export const init = () => {
  hydrateShadowRoots(document);
};
