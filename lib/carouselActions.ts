import { useSceneStore } from '@/store/useSceneStore';
import { defaultsFor, getTemplate } from '@/templates';
import { carouselSlides, type CarouselSlide } from './carouselSlides';
function activate(slide:CarouselSlide,slides:CarouselSlide[]) {
  useSceneStore.getState().setActiveTemplate(slide.templateId);
  if(slide.duration)useSceneStore.getState().setDuration(slide.duration);
  useSceneStore.setState(state=>{
    const values={...defaultsFor(slide.templateId),...slide.values};
    return {carouselSlides:slides,activeSlideId:slide.id,values,frame:slide.frame??0,playing:false,assets:slide.assets??state.assets,tracks:state.tracks.map(track=>track.id===state.activeTrackId?{...track,values}:track)};
  });
  useSceneStore.getState().rehydrateUploads().catch(()=>{});
}
export function addCarouselSlide() {
  const state=useSceneStore.getState(),slides=carouselSlides(state);
  const slide={id:crypto.randomUUID(),templateId:state.activeTemplateId,values:defaultsFor(state.activeTemplateId),duration:getTemplate(state.activeTemplateId).meta.defaultDuration??8,frame:0,assets:state.assets};
  activate(slide,[...slides,slide]);
}
export function selectCarouselSlide(id:string) {
  const slides=carouselSlides(useSceneStore.getState()),slide=slides.find(s=>s.id===id);if(slide)activate(slide,slides);
}
export function removeCarouselSlide(id:string) {
  const state=useSceneStore.getState(),slides=carouselSlides(state);if(slides.length<=1)return;
  const index=slides.findIndex(s=>s.id===id),remaining=slides.filter(s=>s.id!==id);
  if(id===(state.activeSlideId||'first'))activate(remaining[Math.min(index,remaining.length-1)],remaining);
  else useSceneStore.setState({carouselSlides:remaining});
}
