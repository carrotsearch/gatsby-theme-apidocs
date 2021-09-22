/**
 * Selects documents from the index.
 */
public interface IDocumentSelector<T extends IDocumentSet>
    extends IStage<T>, IQueryComponent, IEntitySource {
  Query getQuery() throws Exception;

  default int getUserLimit() {
    return 10000;
  }

  /** Minimum of user limit and license-imposed scope limit. */
  int getEffectiveLimit();

  @Override
  default SizedIterable<IEntity> getEntities() throws Exception {
    final IDocumentSet result = getResult();
    return new SizedIterable<>() {
      @Override
      public int size() {
        return result.size();
      }

      @Override
      public Iterator<IEntity> iterator() {
        return MoreIterators.map(result.iterator(), d -> d::id);
      }
    };
  }
}
