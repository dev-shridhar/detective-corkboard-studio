from typing import Generic, TypeVar, Optional, List, Type
from uuid import UUID
from sqlmodel import SQLModel, Session, select

ModelType = TypeVar("ModelType", bound=SQLModel)


class BaseRepository(Generic[ModelType]):
    """
    Generic base repository providing common CRUD operations.
    All domain repositories extend this class and inherit
    get, get_all, create, update, and delete without repetition.
    """

    def __init__(self, model: Type[ModelType], session: Session) -> None:
        self.model = model
        self.session = session

    def get(self, record_id: UUID) -> Optional[ModelType]:
        """Fetch a single record by primary key. Returns None if not found."""
        return self.session.get(self.model, record_id)

    def get_all(self, offset: int = 0, limit: int = 100) -> List[ModelType]:
        """Fetch a paginated list of all records for this model."""
        statement = select(self.model).offset(offset).limit(limit)
        return self.session.exec(statement).all()

    def create(self, instance: ModelType) -> ModelType:
        """Persist a new record and return the saved instance with generated ID."""
        self.session.add(instance)
        self.session.commit()
        self.session.refresh(instance)
        return instance

    def update(self, instance: ModelType) -> ModelType:
        """Persist changes to an existing record."""
        self.session.add(instance)
        self.session.commit()
        self.session.refresh(instance)
        return instance

    def delete(self, instance: ModelType) -> None:
        """Delete a record from the database."""
        self.session.delete(instance)
        self.session.commit()
