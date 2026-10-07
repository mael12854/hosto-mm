-- Ordonnance post-opératoire : une ordonnance peut être rattachée à une opération.
alter table public.prescriptions add column if not exists operation_id uuid references public.operations(id) on delete set null;
create index if not exists prescriptions_operation_idx on public.prescriptions(operation_id);

-- Le patient lit ses comptes-rendus opératoires une fois signés (pas les brouillons).
create or replace function public.mes_comptes_rendus_operatoires()
returns table (operation_id uuid, compte_rendu jsonb, compte_rendu_signe_le timestamptz)
language sql stable security definer set search_path = public as $$
  select o.id, o.compte_rendu, o.compte_rendu_signe_le
  from operations o join patients p on p.id = o.patient_id
  where p.auth_id = auth.uid() and o.statut <> 'annulée' and o.compte_rendu_signe_le is not null;
$$;
revoke execute on function public.mes_comptes_rendus_operatoires() from public, anon;
grant execute on function public.mes_comptes_rendus_operatoires() to authenticated;
notify pgrst, 'reload schema';
