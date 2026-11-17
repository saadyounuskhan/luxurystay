import { useState } from 'react';

// Tries each photo in order: your real photo first, then the built-in one
export default function SmartImg({ srcs, alt = '', className = '', ...rest }) {
  const list = (Array.isArray(srcs) ? srcs : [srcs]).filter(Boolean);
  const [i, setI] = useState(0);
  if (!list.length || i >= list.length) return null;
  return <img src={list[i]} alt={alt} className={className} onError={() => setI(i + 1)} loading="lazy" {...rest} />;
}
