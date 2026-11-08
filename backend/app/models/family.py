from datetime import datetime
from sqlalchemy import DateTime,ForeignKey,String,UniqueConstraint
from sqlalchemy.orm import Mapped,mapped_column
from app.db.base import Base

class ListMember(Base):
    __tablename__='shopping_list_members'
    __table_args__=(UniqueConstraint('list_id','user_id',name='uq_list_member'),)
    id:Mapped[int]=mapped_column(primary_key=True)
    list_id:Mapped[int]=mapped_column(ForeignKey('shopping_lists.id',ondelete='CASCADE'),index=True)
    user_id:Mapped[int]=mapped_column(ForeignKey('users.id'),index=True)

class ListInvite(Base):
    __tablename__='shopping_list_invites'
    id:Mapped[int]=mapped_column(primary_key=True)
    list_id:Mapped[int]=mapped_column(ForeignKey('shopping_lists.id',ondelete='CASCADE'),index=True)
    token_hash:Mapped[str]=mapped_column(String(64),unique=True)
    expires_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))
