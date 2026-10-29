import JSZip from 'jszip';
import { useSceneStore } from '@/store/useSceneStore';
import { carouselSlides } from './carouselSlides';
import { selectCarouselSlide } from './carouselActions';
import { captureSlidePng } from './captureSlidePng';

export async function exportCarousel(size: { width: number; height: number }) {
  const slides = carouselSlides(useSceneStore.getState());
  const originalId = useSceneStore.getState().activeSlideId || 'first';
  const originalPlaying = useSceneStore.getState().playing;
  const zip = new JSZip();
  try {
    for (const [index, slide] of slides.entries()) {
      if (slide.id !== (useSceneStore.getState().activeSlideId || 'first')) selectCarouselSlide(slide.id);
      const blob = await captureSlidePng(size, slide.frame ?? 0, slide.templateId);
      zip.file(`slide-${String(index + 1).padStart(2, '0')}.png`, blob);
    }
  } finally {
    if (originalId !== (useSceneStore.getState().activeSlideId || 'first')) selectCarouselSlide(originalId);
    useSceneStore.setState({playing:originalPlaying});
  }
  const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'carousel.zip';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
