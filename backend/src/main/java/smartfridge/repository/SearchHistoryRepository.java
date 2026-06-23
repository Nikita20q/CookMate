package smartfridge.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import smartfridge.entity.SearchHistoryEntity;

import java.util.List;

public interface SearchHistoryRepository extends JpaRepository<SearchHistoryEntity, Long> {
    List<SearchHistoryEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
    void deleteByIdAndUserId(Long id, Long userId);
}