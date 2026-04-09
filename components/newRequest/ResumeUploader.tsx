'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './styles/uploader.module.css';
import { FileTextIcon, ArrowUp, XIcon, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Button from '@/components/shared/Button';
import { useAtom } from 'jotai';
import { resumeTextAtom } from '@/store/request-stage';
import { uploadPdfWithProgress } from '@/utils/services/pdf';
import { useRouter } from 'next/navigation';

const ResumeUploader = () => {
  const MAX_LENGTH = 8000;
  const MIN_LENGTH = 100;

  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false); // 텍스트 추출 중.

  const [dragOver, setDragOver] = useState(false); // 드래그 중.

  const [resumeText, setResumeText] = useAtom(resumeTextAtom);

  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  useEffect(() => {
    if (!file) return;

    setUploading(true);
    setExtracting(false);
    setProgress(0);

    (async () => {
      try {
        const { result } = await uploadPdfWithProgress(file, (pct) => {
          const safePct = Math.max(0, Math.min(100, pct)); // 0, ~100
          setProgress(safePct);

          // 100% 도달 시 텍스트 추출 상태로 변경
          if (safePct >= 99) {
            setProgress(100);
            setExtracting(true);
          }
        });

        const extracted = (result ?? '').trim();
        const len = extracted.length;

        if (len < MIN_LENGTH || len > MAX_LENGTH) {
          clearFile();

          alert(
            len < MIN_LENGTH
              ? `추출된 텍스트가 너무 짧습니다. (현재 ${len}자, 최소 ${MIN_LENGTH}자 필요)`
              : `추출된 텍스트가 너무 깁니다. (현재 ${len.toLocaleString()}자, 최대 ${MAX_LENGTH.toLocaleString()}자)`,
          );

          return;
        }

        setResumeText(extracted);
        setProgress(100);
      } catch (error) {
        alert('PDF에 충분한 텍스트가 없습니다. 다시 시도해주세요.');
        clearFile();
      } finally {
        setExtracting(false);
        setUploading(false);
      }
    })();
  }, [file]);

  const onPickFile = () => inputRef.current?.click();

  const onChoose: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    handleFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setExtracting(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const nextStage = () => {
    if (!file && text.length >= MIN_LENGTH && text.length <= MAX_LENGTH) {
      console.log(text);
      setResumeText(text);
    }

    router.push('/new-request/job');
  };

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf')
      return alert('PDF 형식의 파일만 업로드 가능해요.');
    if (f.size > 25 * 1024 * 1024)
      return alert('파일은 최대 25MB까지만 업로드가 가능해요.');

    setFile(f);
    setText('');
  };

  const showFile = !!file;

  const textInRange = text.length >= MIN_LENGTH && text.length <= MAX_LENGTH;
  const fileReady =
    !!file && !!resumeText && progress >= 100 && !uploading && !extracting;

  const canProceed = (!file && textInRange) || fileReady;
  const nextButtonDisabled = uploading || !canProceed;

  // handle
  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (uploading || extracting) return;

    const f = e.dataTransfer.files[0];
    if (!f) return;

    handleFile(f);
  };

  const renderStatusText = () => {
    if (!file) return '';

    if (extracting) {
      return '텍스트 추출 중…';
    }

    if (uploading && progress < 100) {
      return `업로드 중… ${progress.toFixed(0)}%`;
    }

    if (!uploading && !extracting && resumeText) {
      return `완료. ${resumeText.length.toLocaleString()}자 추출됨`;
    }

    return '';
  };

  return (
    <>
      <div className={styles.main}>
        <p className={styles.title}>이력서를 업로드하세요</p>
        <p className={styles.desc}>
          AI가 참고할 자신의 이력서를 PDF로 업로드해주세요.
        </p>

        {/* 업로더 */}
        <section>
          <div
            className={`${styles.uploader} ${
              dragOver ? styles.uploaderDragging : ''
            }`}
            onClick={onPickFile}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={styles.uploadIcon}>
              <FileTextIcon
                size={56}
                strokeWidth={1}
                fill="var(--color-primary-weak)"
                stroke="var(--color-border)"
              />
              <div className={styles.uploadUpIcon}>
                <ArrowUp size={16} strokeWidth={2.5} color="var(--neutral-0)" />
              </div>
            </div>
            <p className={styles.title}>
              {dragOver
                ? '드래그하여 파일을 업로드할 수 있습니다'
                : '이력서 파일을 업로드하세요'}
            </p>
            <p className={styles.desc}>PDF · 최대 25MB · 드래그앤드롭 지원</p>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept="application/pdf"
              onChange={onChoose}
            />
          </div>
        </section>

        {/* 파일 업로드 상태 — 언마운트하지 않고 접기/펼치기 */}
        <motion.section
          layout
          initial={false}
          animate={{
            opacity: showFile ? 1 : 0,
            height: showFile ? 'auto' : 0,
            marginTop: showFile ? 16 : 0,
            marginBottom: showFile ? 15 : 0,
          }}
          transition={{
            duration: 0.25,
            stiffness: 500,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          style={{
            overflow: 'hidden',
            pointerEvents: showFile ? 'auto' : 'none',
            contain: 'layout paint',
            willChange: 'height, opacity',
          }}
        >
          <p className={styles.contentTitle}>PDF 업로드</p>
          <div className={styles.uploadItem}>
            {uploading ? (
              <Loader2 className={styles.spinner} />
            ) : (
              <button className={styles.itemRemoveButton} onClick={clearFile}>
                <XIcon size={16} />
              </button>
            )}
            <div className={styles.itemTop}>
              <div className={styles.itemIcon}>PDF</div>
              <div className={styles.itemText}>
                <p className={styles.itemName}>{file?.name}</p>
                <p className={styles.itemDesc}>{renderStatusText()}</p>
              </div>
            </div>
            <div className={styles.itemBar}>
              <motion.div
                className={styles.bar}
                animate={{ transform: `translateX(${progress}%)` }}
                transition={{ type: 'tween', duration: 0.2 }}
              />
            </div>
          </div>
        </motion.section>
      </div>
      <div className={styles.buttons}>
        <Button text="다음" disabled={nextButtonDisabled} onClick={nextStage} />
      </div>
    </>
  );
};

export default ResumeUploader;
