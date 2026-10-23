-- Apex : lecture publique des fiches et des actualités (à coller dans l'éditeur SQL de Supabase → Run).
-- Le contenu est public (les pronostics s'affichent dans l'app). L'écriture reste réservée au back-end (clé service_role).
-- La colonne `interne` (clés techniques) n'est JAMAIS exposée.

drop policy if exists fiches_lecture_publique on public.fiches;
create policy fiches_lecture_publique on public.fiches for select to anon, authenticated using (true);
grant select (match_id, jour, date_heure, fiche, evalue) on public.fiches to anon, authenticated;

drop policy if exists actualites_lecture_publique on public.actualites;
create policy actualites_lecture_publique on public.actualites for select to anon, authenticated using (true);
grant select (id, categorie, article, publie_le) on public.actualites to anon, authenticated;
