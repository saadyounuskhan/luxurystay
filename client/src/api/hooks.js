import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from './axios';

// GET data:  const { data, isLoading } = useGet(['rooms'], '/rooms', { status: 'available' })
export function useGet(key, url, params, options = {}) {
  return useQuery({
    queryKey: [...key, params],
    queryFn: () => api.get(url, { params }).then((r) => r.data.data),
    ...options,
  });
}

// POST/PATCH/DELETE:  const save = useAction((body) => api.post('/x', body), { invalidate: [['rooms']] })
export function useAction(fn, { invalidate = [], onSuccess, onError } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res, vars) => {
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      onSuccess?.(res?.data ?? res, vars);
    },
    onError: (err) => onError?.(errorMessage(err)),
  });
}

// Opens a PDF that needs the login token
export async function openPdf(url) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  window.open(href, '_blank');
}

export async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(res.data);
  a.download = filename;
  a.click();
}
