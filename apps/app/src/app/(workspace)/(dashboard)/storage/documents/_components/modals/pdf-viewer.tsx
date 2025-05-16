"use client";
import { Button } from "@firebuzz/ui/components/ui/button";
import { Spinner } from "@firebuzz/ui/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@firebuzz/ui/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "@firebuzz/ui/icons/lucide";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

export const PDFViewer = ({ src }: { src: string }) => {
	const [isLoading, setIsLoading] = useState(true);
	const [numPages, setNumPages] = useState<number>();
	const [pageNumber, setPageNumber] = useState<number>(1);

	const containerRef = useRef<HTMLDivElement>(null);
	const [{ containerWidth, containerHeight }, setContainerSize] = useState<{
		containerWidth: number;
		containerHeight: number;
	}>({ containerWidth: 0, containerHeight: 0 });

	useEffect(() => {
		const currentRef = containerRef.current;
		if (!currentRef) return;

		const resizeObserver = new ResizeObserver(() => {
			setContainerSize({
				containerWidth: currentRef.offsetWidth,
				containerHeight: currentRef.offsetHeight,
			});
		});

		resizeObserver.observe(currentRef);

		return () => resizeObserver.unobserve(currentRef);
	}, []);

	function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
		setNumPages(numPages);
		setIsLoading(false);
	}

	return (
		<div ref={containerRef} className="relative w-full h-full">
			<Document file={src} onLoadSuccess={onDocumentLoadSuccess}>
				<Page
					pageNumber={pageNumber}
					width={containerWidth}
					height={containerHeight}
				/>
			</Document>
			{/* Page Change Menu */}
			<AnimatePresence>
				{!isLoading && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.2 }}
						className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center "
					>
						<div className="flex items-center justify-center overflow-hidden border rounded-md shadow-sm bg-muted">
							<div className="px-4 text-sm font-medium">
								Page {pageNumber} of {numPages}
							</div>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										disabled={pageNumber === 1}
										variant="outline"
										size="iconSm"
										className="border-t-0 border-b-0 rounded-none"
										onClick={() =>
											setPageNumber((prev) => {
												if (prev === 1) return prev;
												return prev - 1;
											})
										}
									>
										<ChevronLeft className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Previous Page</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										disabled={pageNumber === numPages}
										variant="outline"
										size="iconSm"
										className="border-none rounded-none"
										onClick={() =>
											setPageNumber((prev) => {
												if (prev === numPages) return prev;
												return prev + 1;
											})
										}
									>
										<ChevronRight className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Next Page</TooltipContent>
							</Tooltip>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
			{isLoading && (
				<div className="absolute inset-0 flex items-center justify-center bg-background">
					<Spinner size="sm" />
				</div>
			)}
		</div>
	);
};
