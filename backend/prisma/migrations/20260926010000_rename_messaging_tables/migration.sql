-- Rename only the messaging tables. PostgreSQL preserves their rows, indexes, and foreign keys.
ALTER TABLE "users" RENAME TO "Users";
ALTER TABLE "message_requests" RENAME TO "MessageRequests";
ALTER TABLE "conversations" RENAME TO "Conversations";
ALTER TABLE "conversation_members" RENAME TO "ConversationMembers";
ALTER TABLE "messages" RENAME TO "Messages";
ALTER TABLE "message_reactions" RENAME TO "MessageReactions";
