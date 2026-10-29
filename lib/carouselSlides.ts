import type { SceneState } from '@/store/useSceneStore';
export interface CarouselSlide { id:string; templateId:string; values:Record<string,any>; duration?:number; frame?:number; assets?:SceneState['assets']; preview?:string }
export function carouselSlides(state:Pick<SceneState,'carouselSlides'|'activeSlideId'|'activeTemplateId'|'values'|'duration'|'frame'|'assets'>):CarouselSlide[] {
  const slides=state.carouselSlides.length?state.carouselSlides:[{id:'first',templateId:state.activeTemplateId,values:state.values}];
  return slides.map(slide=>slide.id===(state.activeSlideId||'first')?{...slide,templateId:state.activeTemplateId,values:state.values,duration:state.duration,frame:state.frame,assets:state.assets}:slide);
}
