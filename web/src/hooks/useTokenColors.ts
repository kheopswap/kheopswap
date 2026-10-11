import { combineLatest, Observable, of, shareReplay, startWith } from "rxjs";
import { bindSerialized } from "../utils/bindSerialized";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { getDominantColor } from "../utils/getDominantColor";

const SAMPLE_SIZE = 40;

const readDominantColor = (image: HTMLImageElement) => {
	const canvas = document.createElement("canvas");
	canvas.width = SAMPLE_SIZE;
	canvas.height = SAMPLE_SIZE;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return null;
	try {
		context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
		return getDominantColor(
			context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data,
		);
	} catch {
		// a logo served without CORS headers taints the canvas
		return null;
	}
};

const getTokenColor$ = (logoUrl: string) =>
	getCachedObservable$("getTokenColor$", logoUrl, () =>
		new Observable<string | null>((subscriber) => {
			const image = new Image();
			image.crossOrigin = "anonymous";
			image.onload = () => {
				subscriber.next(readDominantColor(image));
				subscriber.complete();
			};
			image.onerror = () => {
				subscriber.next(null);
				subscriber.complete();
			};
			image.src = logoUrl;
		}).pipe(shareReplay(1)),
	);

export const useTokenColors = bindSerialized(
	(logoUrls: (string | undefined)[]) =>
		logoUrls.length
			? combineLatest(
					logoUrls.map((logoUrl) =>
						logoUrl ? getTokenColor$(logoUrl).pipe(startWith(null)) : of(null),
					),
				)
			: of([]),
	(logoUrls): (string | null)[] => logoUrls.map(() => null),
);
