package smartfridge.parser.factories;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jdk.dynalink.linker.LinkerServices;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Component;
import smartfridge.parser.BaseInstructionParser;

import org.jsoup.nodes.Document;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Component
@AllArgsConstructor
public class InstructionParserFactory {
    private final List<BaseInstructionParser> parsers;

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
