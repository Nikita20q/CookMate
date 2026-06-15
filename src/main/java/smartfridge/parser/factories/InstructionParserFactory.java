package smartfridge.parser.factories;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;
import smartfridge.parser.BaseInstructionParser;

import org.jsoup.nodes.Document;
import java.util.Comparator;
import java.util.List;

@Component
public class InstructionParserFactory {
    private final List<BaseInstructionParser> parsers;

    public InstructionParserFactory(List<BaseInstructionParser> parsers) {
        this.parsers = parsers;
    }

    public ArrayNode parseSteps(Document document, ObjectMapper objectMapper) {
        List<BaseInstructionParser> sortedParsers = parsers.stream()
                .sorted(Comparator.comparingInt(BaseInstructionParser::getPriority))
                .toList();
        for (BaseInstructionParser parser : sortedParsers) {
            if (parser.canParse(document)) {
                System.out.println("Используется парсер: " +  parser.getName());
                return parser.parsePage(document, objectMapper);
            }
        }
        System.out.println(" Не найден подходящий парсер для структуры страницы");
        return objectMapper.createArrayNode();
    }
}
