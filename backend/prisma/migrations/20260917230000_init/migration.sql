create schema if not exists "public";

create table "message_requests" (
  "id" bigserial not null,
  "sender_id" bigint not null,
  "recipient_id" bigint not null,
  "status" text not null default 'pending',
  "created_at" timestamptz(6) not null default current_timestamp,
  "responded_at" timestamptz(6),
  constraint "message_requests_pkey" primary key ("id"),
  constraint "message_requests_status_check" check ("status" in ('pending', 'accepted', 'declined')),
  constraint "message_requests_check" check ("sender_id" <> "recipient_id")
);

create table "conversations" (
  "id" bigserial not null,
  "created_at" timestamptz(6) not null default current_timestamp,
  constraint "conversations_pkey" primary key ("id")
);

create table "conversation_members" (
  "conversation_id" bigint not null,
  "user_id" bigint not null,
  "joined_at" timestamptz(6) not null default current_timestamp,
  constraint "conversation_members_pkey" primary key ("conversation_id", "user_id")
);

create table "messages" (
  "id" bigserial not null,
  "conversation_id" bigint not null,
  "sender_id" bigint not null,
  "content" text not null,
  "created_at" timestamptz(6) not null default current_timestamp,
  "edited_at" timestamptz(6),
  "deleted_at" timestamptz(6),
  constraint "messages_pkey" primary key ("id"),
  constraint "messages_content_check" check (char_length(trim("content")) > 0)
);

create table "message_reactions" (
  "message_id" bigint not null,
  "user_id" bigint not null,
  "emoji" text not null,
  "created_at" timestamptz(6) not null default current_timestamp,
  constraint "message_reactions_pkey" primary key ("message_id", "user_id", "emoji"),
  constraint "message_reactions_emoji_check" check (char_length(trim("emoji")) > 0)
);

create table "users" (
  "id" bigserial not null,
  "name" text not null,
  "email" text not null,
  "role" text not null,
  "created_at" timestamptz(6) not null default current_timestamp,
  constraint "users_pkey" primary key ("id"),
  constraint "users_email_check" check ("email" ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint "users_name_check" check (char_length(trim("name")) > 0),
  constraint "users_role_check" check ("role" in ('user', 'shelter_staff', 'admin'))
);

create index "message_requests_recipient_status_index" on "message_requests"("recipient_id", "status", "created_at" desc);
create unique index "message_requests_one_pending_request" on "message_requests"("sender_id", "recipient_id") where ("status" = 'pending');
create index "conversation_members_user_id_conversation_id_idx" on "conversation_members"("user_id", "conversation_id");
create index "messages_conversation_id_created_at_idx" on "messages"("conversation_id", "created_at");
create index "message_reactions_message_id_idx" on "message_reactions"("message_id");
create unique index "users_email_key" on "users"("email");

alter table "message_requests" add constraint "message_requests_sender_id_fkey" foreign key ("sender_id") references "users"("id") on delete cascade on update cascade;
alter table "message_requests" add constraint "message_requests_recipient_id_fkey" foreign key ("recipient_id") references "users"("id") on delete cascade on update cascade;
alter table "conversation_members" add constraint "conversation_members_conversation_id_fkey" foreign key ("conversation_id") references "conversations"("id") on delete cascade on update cascade;
alter table "conversation_members" add constraint "conversation_members_user_id_fkey" foreign key ("user_id") references "users"("id") on delete cascade on update cascade;
alter table "messages" add constraint "messages_conversation_id_fkey" foreign key ("conversation_id") references "conversations"("id") on delete cascade on update cascade;
alter table "messages" add constraint "messages_sender_id_fkey" foreign key ("sender_id") references "users"("id") on delete restrict on update cascade;
alter table "message_reactions" add constraint "message_reactions_message_id_fkey" foreign key ("message_id") references "messages"("id") on delete cascade on update cascade;
alter table "message_reactions" add constraint "message_reactions_user_id_fkey" foreign key ("user_id") references "users"("id") on delete cascade on update cascade;
