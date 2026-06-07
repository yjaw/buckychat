package db

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	Pool *pgxpool.Pool
}

type Profile struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type Report struct {
	ID             string    `json:"id"`
	ReporterID     string    `json:"reporterID"`
	ReportedUserID *string   `json:"reportedUserID,omitempty"`
	RoomID         *string   `json:"roomID,omitempty"`
	Reason         string    `json:"reason"`
	Details        *string   `json:"details,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

func Connect(ctx context.Context, databaseURL string) (*Store, error) {
	if databaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{Pool: pool}, nil
}

func (s *Store) Close() {
	if s != nil && s.Pool != nil {
		s.Pool.Close()
	}
}

func (s *Store) GetProfile(ctx context.Context, userID string) (Profile, error) {
	var p Profile
	err := s.Pool.QueryRow(ctx, `
		select id::text, email, status, created_at
		from public.profiles
		where id = $1
	`, userID).Scan(&p.ID, &p.Email, &p.Status, &p.CreatedAt)
	return p, err
}

func (s *Store) EnsureProfile(ctx context.Context, userID, email string) (Profile, error) {
	_, err := s.Pool.Exec(ctx, `
		insert into public.profiles (id, email)
		values ($1, $2)
		on conflict (id) do update set email = excluded.email
	`, userID, email)
	if err != nil {
		return Profile{}, err
	}
	return s.GetProfile(ctx, userID)
}

func (s *Store) CreateReport(ctx context.Context, reporterID, reportedUserID, roomID, reason, details string) (Report, error) {
	var reported *string
	if reportedUserID != "" {
		reported = &reportedUserID
	}
	var room *string
	if roomID != "" {
		room = &roomID
	}
	var detailPtr *string
	if details != "" {
		detailPtr = &details
	}

	var r Report
	err := s.Pool.QueryRow(ctx, `
		insert into public.reports (reporter_id, reported_user_id, room_id, reason, details)
		values ($1, $2, $3, $4, $5)
		returning id::text, reporter_id::text, reported_user_id::text, room_id, reason, details, created_at
	`, reporterID, reported, room, reason, detailPtr).Scan(
		&r.ID,
		&r.ReporterID,
		&r.ReportedUserID,
		&r.RoomID,
		&r.Reason,
		&r.Details,
		&r.CreatedAt,
	)
	return r, err
}

func (s *Store) ListReports(ctx context.Context, limit int) ([]Report, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	rows, err := s.Pool.Query(ctx, `
		select id::text, reporter_id::text, reported_user_id::text, room_id, reason, details, created_at
		from public.reports
		order by created_at desc
		limit $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reports := []Report{}
	for rows.Next() {
		var r Report
		if err := rows.Scan(&r.ID, &r.ReporterID, &r.ReportedUserID, &r.RoomID, &r.Reason, &r.Details, &r.CreatedAt); err != nil {
			return nil, err
		}
		reports = append(reports, r)
	}
	return reports, rows.Err()
}

func (s *Store) BanUser(ctx context.Context, userID, bannedBy, reason string) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		update public.profiles
		set status = 'banned'
		where id = $1
	`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	_, err = tx.Exec(ctx, `
		insert into public.bans (user_id, banned_by, reason)
		values ($1, $2, $3)
	`, userID, bannedBy, reason)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
