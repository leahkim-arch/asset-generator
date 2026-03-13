"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, Grid3X3, Download } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Asset Set Generator</span>
          </div>
          <Link href="/create">
            <Button>에셋 만들기</Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            AI 기반 스티커 에셋 자동 생성
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight">
            기획안 하나로
            <br />
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              수십 개의 스티커 에셋
            </span>
            을
            <br />
            자동으로 만들어보세요
          </h1>

          <p className="mb-10 text-lg text-muted-foreground">
            기획안과 레퍼런스를 업로드하면, AI가 컨셉을 분석하고
            <br />
            해당 컨셉에 맞는 스티커 에셋을 한꺼번에 생성합니다.
          </p>

          <Link href="/create">
            <Button size="lg" className="h-14 px-8 text-base">
              <Sparkles className="mr-2 h-5 w-5" />
              에셋 생성 시작하기
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-24 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          <FeatureCard
            icon={<Upload className="h-8 w-8" />}
            title="기획안 & 레퍼런스 분석"
            description="기획안 텍스트와 레퍼런스 이미지를 AI가 자동으로 분석하여 컨셉을 파악합니다."
          />
          <FeatureCard
            icon={<Grid3X3 className="h-8 w-8" />}
            title="대량 에셋 자동 생성"
            description="9~36개의 스티커 에셋을 컨셉에 맞춰 한 번에 자동 생성합니다."
          />
          <FeatureCard
            icon={<Download className="h-8 w-8" />}
            title="일괄 다운로드"
            description="생성된 에셋을 미리보기 후 ZIP으로 한번에 다운로드합니다."
          />
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Asset Set Generator
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-left">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
