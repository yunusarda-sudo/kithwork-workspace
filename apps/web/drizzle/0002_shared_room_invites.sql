CREATE OR REPLACE FUNCTION redeem_room_invite(p_token_hash text, p_user_id text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE invite_row record;
BEGIN
  IF current_setting('app.user_id', true) IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'invalid invite redemption context';
  END IF;

  SELECT id, room_id, role, uses, uses_limit
    INTO invite_row
    FROM room_invites
    WHERE token_hash = p_token_hash AND revoked = false AND expires_at > now()
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- A user already in the room can retry without consuming another seat.
  IF EXISTS (SELECT 1 FROM room_members WHERE room_id = invite_row.room_id AND user_id = p_user_id) THEN
    RETURN invite_row.room_id;
  END IF;
  IF invite_row.uses >= invite_row.uses_limit THEN
    RETURN NULL;
  END IF;

  UPDATE room_invites SET uses = uses + 1 WHERE id = invite_row.id;
  INSERT INTO room_members (room_id, user_id, role)
    VALUES (invite_row.room_id, p_user_id, invite_row.role)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN invite_row.room_id;
END;
$$;--> statement-breakpoint
