export function csvCell(value:unknown){let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return `"${s.replaceAll('"','""')}"`;}
export function downloadCsv(filename:string,rows:Record<string,unknown>[]){
  const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const content='\ufeff'+[columns.map(csvCell).join(';'),...rows.map(r=>columns.map(c=>csvCell(r[c])).join(';'))].join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
