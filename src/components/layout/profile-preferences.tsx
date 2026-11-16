"use client";
import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useFinances } from '@/hooks/use-finances';
import { text } from '@/lib/domain';
export function ProfilePreferences(){
  const {data}=useFinances(),{setTheme}=useTheme();const theme=text(data?.profiles?.[0]?.theme);
  useEffect(()=>{if(theme)setTheme(theme);},[theme,setTheme]);
  return null;
}
