"use client";
import { Failure } from '@/components/ui/data-state';
export default function ErrorPage({reset}:{reset:()=>void}){return <Failure message="Ocorreu um erro ao exibir esta página. Seus dados continuam salvos." retry={reset}/>;}
