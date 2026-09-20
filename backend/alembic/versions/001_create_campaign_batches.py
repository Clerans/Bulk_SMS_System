"""create campaign_batches and link to recipients and delivery events

Revision ID: 001_campaign_batches
Revises: 
Create Date: 2026-09-20 12:40:00.000000

"""
from typing import Sequence, Union
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_campaign_batches'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create batch_status_enum if not exists
    batch_status_enum = postgresql.ENUM(
        'PENDING', 'PROCESSING', 'ACCEPTED', 'SUBMITTED', 'DELIVERING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED',
        name='batch_status_enum'
    )
    batch_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create campaign_batches table
    op.create_table(
        'campaign_batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('campaign_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaigns.id', ondelete='CASCADE'), nullable=False),
        sa.Column('batch_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('transaction_id', sa.BigInteger(), nullable=False),
        sa.Column('gateway_campaign_id', sa.String(length=50), nullable=True),
        sa.Column('recipient_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('accepted_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('submitted_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('delivered_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('failed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'ACCEPTED', 'SUBMITTED', 'DELIVERING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED', name='batch_status_enum'), nullable=False, server_default='PENDING'),
        sa.Column('cost', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('gateway_response', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(length=50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    
    op.create_index('ix_campaign_batches_id', 'campaign_batches', ['id'])
    op.create_index('ix_campaign_batches_campaign_id', 'campaign_batches', ['campaign_id'])
    op.create_index('ix_campaign_batches_transaction_id', 'campaign_batches', ['transaction_id'], unique=True)
    op.create_index('ix_campaign_batches_gateway_campaign_id', 'campaign_batches', ['gateway_campaign_id'])

    # 3. Add batch_id to campaign_recipients
    op.add_column('campaign_recipients', sa.Column('batch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaign_batches.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_campaign_recipients_batch_id', 'campaign_recipients', ['batch_id'])

    # 4. Add batch_id and normalized_status to delivery_events
    op.add_column('delivery_events', sa.Column('batch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('campaign_batches.id', ondelete='SET NULL'), nullable=True))
    op.add_column('delivery_events', sa.Column('normalized_status', sa.String(length=50), nullable=True))
    op.create_index('ix_delivery_events_batch_id', 'delivery_events', ['batch_id'])


def downgrade() -> None:
    op.drop_index('ix_delivery_events_batch_id', table_name='delivery_events')
    op.drop_column('delivery_events', 'normalized_status')
    op.drop_column('delivery_events', 'batch_id')

    op.drop_index('ix_campaign_recipients_batch_id', table_name='campaign_recipients')
    op.drop_column('campaign_recipients', 'batch_id')

    op.drop_index('ix_campaign_batches_gateway_campaign_id', table_name='campaign_batches')
    op.drop_index('ix_campaign_batches_transaction_id', table_name='campaign_batches')
    op.drop_index('ix_campaign_batches_campaign_id', table_name='campaign_batches')
    op.drop_index('ix_campaign_batches_id', table_name='campaign_batches')
    op.drop_table('campaign_batches')

    batch_status_enum = postgresql.ENUM(
        'PENDING', 'PROCESSING', 'ACCEPTED', 'SUBMITTED', 'DELIVERING', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED',
        name='batch_status_enum'
    )
    batch_status_enum.drop(op.get_bind(), checkfirst=True)
